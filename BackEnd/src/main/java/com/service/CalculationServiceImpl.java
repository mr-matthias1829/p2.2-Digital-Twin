package com.service;

import com.dto.CalculationRequest;
import com.dto.CalculationResponse;
import com.dto.OccupationRequest;
import com.dto.OccupationResponse;
import com.dto.GoalCheckResponse;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
            return new OccupationResponse(0.0, 0.0, 0.0, new HashMap<>());
        }

        // Calculate total occupied area and breakdown by type
        double totalOccupiedArea = 0.0;
        Map<String, Double> typeAreas = new HashMap<>();
        
        if (request.getPolygonAreas() != null) {
            for (OccupationRequest.PolygonArea polygon : request.getPolygonAreas()) {
                // Check if all vertices are inside the Spoordok polygon
                if (isPolygonInsideSpoordok(polygon.getPositions(), request.getSpoordokPositions())) {
                    double area = calculateAreaFromPositions(polygon.getPositions());
                    totalOccupiedArea += area;
                    
                    // Track area by type
                    String type = polygon.getType() != null ? polygon.getType() : "unknown";
                    typeAreas.put(type, typeAreas.getOrDefault(type, 0.0) + area);
                }
            }
        }

        // Calculate percentage
        double occupationPercentage = (totalOccupiedArea / spoordokArea) * 100.0;

        // Build type breakdown
        Map<String, OccupationResponse.TypeOccupation> typeBreakdown = new HashMap<>();
        for (Map.Entry<String, Double> entry : typeAreas.entrySet()) {
            double typePercentage = (entry.getValue() / spoordokArea) * 100.0;
            typeBreakdown.put(entry.getKey(), new OccupationResponse.TypeOccupation(entry.getValue(), typePercentage));
        }

        // Always add "unoccupied" area
        double unoccupiedArea = spoordokArea - totalOccupiedArea;
        double unoccupiedPercentage = (unoccupiedArea / spoordokArea) * 100.0;
        typeBreakdown.put("unoccupied", new OccupationResponse.TypeOccupation(unoccupiedArea, unoccupiedPercentage));

        return new OccupationResponse(spoordokArea, totalOccupiedArea, occupationPercentage, typeBreakdown);
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

    @Override
    public GoalCheckResponse checkGoals(OccupationRequest request) {
        // First calculate occupation to get the type breakdown
        OccupationResponse occupation = calculateOccupation(request);
        
        List<GoalCheckResponse.Goal> goals = new ArrayList<>();
        
        if (occupation.getTypeBreakdown() != null) {
            Map<String, OccupationResponse.TypeOccupation> typeBreakdown = occupation.getTypeBreakdown();
            
            // Goal 1: Minimum 20% nature
            double naturePercentage = 0.0;
            if (typeBreakdown.containsKey("nature")) {
                naturePercentage = typeBreakdown.get("nature").getPercentage();
            }
            boolean natureGoalAchieved = naturePercentage >= 20.0;
            goals.add(new GoalCheckResponse.Goal(
                "nature_min",
                "Minimum 20% nature",
                natureGoalAchieved,
                naturePercentage,
                20.0,
                "min"
            ));
            
            // Goal 2: Maximum 20% commercial building of total buildings only
            // Only count actual buildings: houses, apartments, commercial, covered parking
            double commercialArea = 0.0;
            if (typeBreakdown.containsKey("commercial building")) {
                commercialArea = typeBreakdown.get("commercial building").getArea();
            }
            
            // Calculate total building area (excluding nature, water, roads, open parking)
            String[] buildingTypes = {"detached house", "townhouse", "apartment", "commercial building", "covered parking space"};
            double totalBuildingArea = 0.0;
            for (String buildingType : buildingTypes) {
                if (typeBreakdown.containsKey(buildingType)) {
                    totalBuildingArea += typeBreakdown.get(buildingType).getArea();
                }
            }
            
            double commercialPercentageOfBuildings = 0.0;
            if (totalBuildingArea > 0) {
                commercialPercentageOfBuildings = (commercialArea / totalBuildingArea) * 100.0;
            }
            
            boolean commercialGoalAchieved = commercialPercentageOfBuildings <= 20.0;
            goals.add(new GoalCheckResponse.Goal(
                "commercial_max",
                "Maximum 20% commercial building of total buildings",
                commercialGoalAchieved,
                commercialPercentageOfBuildings,
                20.0,
                "max"
            ));
        }
        
        return new GoalCheckResponse(goals);
    }
}
