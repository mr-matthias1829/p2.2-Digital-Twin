package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.dto.CalculationRequest;
import com.digitaltwin.spoordok.dto.CalculationResponse;
import com.digitaltwin.spoordok.dto.OccupationRequest;
import com.digitaltwin.spoordok.dto.OccupationResponse;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Service for calculating area and volume of polygons.
 * This implements the same algorithm as the client-side polygonUtils.js
 * using local ENU projection and 2D shoelace formula.
 */
@Service
public class CalculationServiceImpl implements CalculationService {

    @Override
    public CalculationResponse calculateAreaAndVolume(CalculationRequest request) {
        List<CalculationRequest.Position> positions = request.getPositions();
        
        if (positions == null || positions.size() < 3) {
            return new CalculationResponse(0.0, null, request.getHeight());
        }

        // Calculate area using the same algorithm as polygonUtils.js
        double area = calculateAreaFromPositions(positions);
        
        // Calculate volume if height is provided
        Double volume = null;
        if (request.getHeight() != null && request.getHeight() > 0) {
            volume = area * request.getHeight();
        }

        return new CalculationResponse(area, volume, request.getHeight());
    }

    /**
     * Compute planar polygon area in m² using local ENU projection and 2D shoelace formula.
     * This is a Java port of the JavaScript areaFromCartesianPositions function.
     */
    private double calculateAreaFromPositions(List<CalculationRequest.Position> positions) {
        if (positions == null || positions.size() < 3) {
            return 0.0;
        }

        // Compute centroid to reduce distortion in local ENU frame
        double centroidX = 0, centroidY = 0, centroidZ = 0;
        for (CalculationRequest.Position p : positions) {
            centroidX += p.getX();
            centroidY += p.getY();
            centroidZ += p.getZ();
        }
        centroidX /= positions.size();
        centroidY /= positions.size();
        centroidZ /= positions.size();

        // Transform global points to local East-North-Up coordinates
        double[][] localPositions = new double[positions.size()][3];
        
        for (int i = 0; i < positions.size(); i++) {
            CalculationRequest.Position p = positions.get(i);
            double[] local = cartesianToLocalENU(
                p.getX(), p.getY(), p.getZ(),
                centroidX, centroidY, centroidZ
            );
            localPositions[i] = local;
        }

        // Shoelace formula on XY plane
        double area = 0.0;
        for (int i = 0; i < localPositions.length; i++) {
            double[] a = localPositions[i];
            double[] b = localPositions[(i + 1) % localPositions.length];
            area += (a[0] * b[1] - b[0] * a[1]);
        }

        return Math.abs(area) * 0.5; // final area in m²
    }

    /**
     * Transform a Cartesian3 point to local East-North-Up coordinates
     * relative to a reference point (centroid).
     */
    private double[] cartesianToLocalENU(double x, double y, double z,
                                          double refX, double refY, double refZ) {
        // Create East-North-Up transformation matrix at reference point
        // This is a simplified version - in Cesium.js this uses Matrix4 transforms
        
        // Calculate the normalized reference vector
        double refLength = Math.sqrt(refX * refX + refY * refY + refZ * refZ);
        double normRefX = refX / refLength;
        double normRefY = refY / refLength;
        double normRefZ = refZ / refLength;

        // Calculate East vector (perpendicular to reference in XY plane)
        double eastLength = Math.sqrt(normRefX * normRefX + normRefY * normRefY);
        double eastX = -normRefY / eastLength;
        double eastY = normRefX / eastLength;
        double eastZ = 0.0;

        // Calculate North vector (perpendicular to both up and east)
        double northX = -normRefZ * eastY;
        double northY = normRefZ * eastX;
        double northZ = normRefX * eastY - normRefY * eastX;

        // Normalize North vector
        double northLength = Math.sqrt(northX * northX + northY * northY + northZ * northZ);
        northX /= northLength;
        northY /= northLength;
        northZ /= northLength;

        // Transform point to local coordinates
        double dx = x - refX;
        double dy = y - refY;
        double dz = z - refZ;

        double localEast = dx * eastX + dy * eastY + dz * eastZ;
        double localNorth = dx * northX + dy * northY + dz * northZ;
        double localUp = dx * normRefX + dy * normRefY + dz * normRefZ;

        return new double[]{localEast, localNorth, localUp};
    }

    @Override
    public OccupationResponse calculateOccupation(OccupationRequest request) {
        // Calculate the total Spoordok area
        double spoordokArea = calculateAreaFromPositions(request.getSpoordokPositions());
        
        if (spoordokArea == 0.0) {
            return new OccupationResponse(0.0, 0.0, 0.0);
        }

        // Calculate total occupied area by summing only polygons completely inside Spoordok
        double totalOccupiedArea = 0.0;
        if (request.getPolygonAreas() != null) {
            for (OccupationRequest.PolygonArea polygon : request.getPolygonAreas()) {
                // Check if all vertices are inside the Spoordok polygon
                if (isPolygonInsideSpoordok(polygon.getPositions(), request.getSpoordokPositions())) {
                    double area = calculateAreaFromPositions(polygon.getPositions());
                    totalOccupiedArea += area;
                }
            }
        }

        // Calculate percentage
        double occupationPercentage = (totalOccupiedArea / spoordokArea) * 100.0;

        return new OccupationResponse(spoordokArea, totalOccupiedArea, occupationPercentage);
    }

    /**
     * Check if a polygon is completely inside the Spoordok boundary using ray casting algorithm.
     */
    private boolean isPolygonInsideSpoordok(List<CalculationRequest.Position> polygonPositions, 
                                            List<CalculationRequest.Position> spoordokPositions) {
        if (polygonPositions == null || polygonPositions.isEmpty()) {
            return false;
        }

        // All vertices must be inside the Spoordok for the polygon to be counted
        for (CalculationRequest.Position point : polygonPositions) {
            if (!isPointInsidePolygon(point, spoordokPositions)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Ray casting algorithm to check if a point is inside a polygon.
     * Uses 2D projection (x, y coordinates).
     */
    private boolean isPointInsidePolygon(CalculationRequest.Position point, 
                                         List<CalculationRequest.Position> polygon) {
        int intersections = 0;
        int n = polygon.size();

        for (int i = 0; i < n; i++) {
            CalculationRequest.Position p1 = polygon.get(i);
            CalculationRequest.Position p2 = polygon.get((i + 1) % n);

            // Check if the ray from point to the right intersects the edge
            if ((p1.getY() > point.getY()) != (p2.getY() > point.getY())) {
                double xIntersection = (p2.getX() - p1.getX()) * (point.getY() - p1.getY()) / 
                                       (p2.getY() - p1.getY()) + p1.getX();
                if (point.getX() < xIntersection) {
                    intersections++;
                }
            }
        }

        // Odd number of intersections means the point is inside
        return (intersections % 2) == 1;
    }
}
