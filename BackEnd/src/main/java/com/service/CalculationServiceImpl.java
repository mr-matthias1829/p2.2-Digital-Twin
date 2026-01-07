package com.service;

import com.dto.CalculationRequest;
import com.dto.CalculationResponse;
import com.dto.OccupationRequest;
import com.dto.OccupationResponse;
import com.dto.GoalCheckResponse;
import com.model.BuildingType;
import com.model.Goal;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Service for calculating area and volume of polygons.
 * This implements the same algorithm as the client-side polygonUtils.js
 * using local ENU projection and 2D shoelace formula.
 */
@Service
public class CalculationServiceImpl implements CalculationService {

    @Autowired
    private BuildingTypeService buildingTypeService;

    @Autowired
    private GoalService goalService;

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
     *
     * Has a fallback now whenever local coordinates are received
     * However, the output area of the local coords are inaccurate
     * Local coords are only ever given from testing
     *
     * For production, ALWAYS use proper cartesian coords
     */
    private double calculateAreaFromPositions(List<CalculationRequest.Position> positions) {
        if (positions == null || positions.size() < 3) {
            return 0.0;
        }

        // Compute centroid
        double cx = 0, cy = 0, cz = 0;
        for (var p : positions) {
            cx += p.getX();
            cy += p.getY();
            cz += p.getZ();
        }
        cx /= positions.size();
        cy /= positions.size();
        cz /= positions.size();

        // Convert to ENU
        double[][] enu = new double[positions.size()][3];
        for (int i = 0; i < positions.size(); i++) {
            var p = positions.get(i);
            enu[i] = cartesianToLocalENU(
                    p.getX(), p.getY(), p.getZ(),
                    cx, cy, cz
            );
        }

        double enuArea = shoelaceAreaXY(enu);

        // SAFETY: if ENU collapses, assume local XY input
        if (enuArea < 1e-6) {
            double[][] localXY = new double[positions.size()][3];
            for (int i = 0; i < positions.size(); i++) {
                var p = positions.get(i);
                localXY[i][0] = p.getX();
                localXY[i][1] = p.getY();
            }
            return shoelaceAreaXY(localXY);
        }

        return enuArea;
    }

    private double shoelaceAreaXY(double[][] pts) {
        double area = 0.0;
        for (int i = 0; i < pts.length; i++) {
            double[] a = pts[i];
            double[] b = pts[(i + 1) % pts.length];
            area += (a[0] * b[1] - b[0] * a[1]);
        }
        return Math.abs(area) * 0.5;
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
        Map<String, Double> typeVolumes = new HashMap<>();
        double natureOnTopArea = 0.0;  // Track nature on top separately (doesn't count for occupation)

        if (request.getPolygonAreas() != null) {
            for (OccupationRequest.PolygonArea polygon : request.getPolygonAreas()) {
                // Check if all vertices are inside the Spoordok polygon
                if (isPolygonInsideSpoordok(polygon.getPositions(), request.getSpoordokPositions())) {
                    double area = calculateAreaFromPositions(polygon.getPositions());

                    // If has nature on top, add to nature on top counter
                    if (Boolean.TRUE.equals(polygon.getHasNatureOnTop())) {
                        natureOnTopArea += area;
                    }

                    // Always add to occupation (nature on top doesn't change the building's footprint)
                    totalOccupiedArea += area;

                    // Track area by type
                    String type = polygon.getType() != null ? polygon.getType() : "unknown";
                    typeAreas.put(type, typeAreas.getOrDefault(type, 0.0) + area);

                    // Track volume by type (for volume-based calculations)
                    Double height = polygon.getHeight();
                    if (height != null && height > 0) {
                        double volume = area * height;
                        typeVolumes.put(type, typeVolumes.getOrDefault(type, 0.0) + volume);
                    }
                }
            }
        }

        // Calculate percentage
        double occupationPercentage = (totalOccupiedArea / spoordokArea) * 100.0;

        // Build type breakdown with people calculation
        Map<String, OccupationResponse.TypeOccupation> typeBreakdown = new HashMap<>();
        for (Map.Entry<String, Double> entry : typeAreas.entrySet()) {
            double typePercentage = (entry.getValue() / spoordokArea) * 100.0;
            String type = entry.getKey();
            double area = entry.getValue();

            // Calculate people for this type
            double people = 0.0;
            Optional<BuildingType> buildingTypeOpt = buildingTypeService.getBuildingTypeByTypeId(type);
            if (buildingTypeOpt.isPresent()) {
                BuildingType buildingType = buildingTypeOpt.get();
                double measurement = area; // Default to area

                // Use volume if this type is volume-based and we have volume data
                if ("volume".equalsIgnoreCase(buildingType.getCalculationBase()) && typeVolumes.containsKey(type)) {
                    measurement = typeVolumes.get(type);
                }

                people = buildingType.getPeople() * measurement;
            }

            typeBreakdown.put(type, new OccupationResponse.TypeOccupation(area, typePercentage, people));
        }

        // Add nature on top area to the "nature" type for goal calculations (but it's already counted in occupation)
        if (natureOnTopArea > 0.0) {
            if (typeBreakdown.containsKey("nature")) {
                // Add to existing nature area
                OccupationResponse.TypeOccupation existingNature = typeBreakdown.get("nature");
                double totalNatureArea = existingNature.getArea() + natureOnTopArea;
                double totalNaturePercentage = (totalNatureArea / spoordokArea) * 100.0;
                typeBreakdown.put("nature", new OccupationResponse.TypeOccupation(totalNatureArea, totalNaturePercentage, existingNature.getPeople()));
            } else {
                // Create new nature entry with just the on-top area
                double naturePercentage = (natureOnTopArea / spoordokArea) * 100.0;
                typeBreakdown.put("nature", new OccupationResponse.TypeOccupation(natureOnTopArea, naturePercentage, 0.0));
            }
        }

        // Always add "unoccupied" area
        double unoccupiedArea = spoordokArea - totalOccupiedArea;
        double unoccupiedPercentage = (unoccupiedArea / spoordokArea) * 100.0;
        typeBreakdown.put("unoccupied", new OccupationResponse.TypeOccupation(unoccupiedArea, unoccupiedPercentage, 0.0));

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

        // Get all goals from database
        List<Goal> dbGoals = goalService.getAllGoals();

        if (occupation.getTypeBreakdown() != null) {
            Map<String, OccupationResponse.TypeOccupation> typeBreakdown = occupation.getTypeBreakdown();

            // Process each goal from database
            for (Goal dbGoal : dbGoals) {
                if (!dbGoal.getEnabled()) {
                    continue; // Skip disabled goals
                }

                double currentValue = 0.0;
                boolean achieved = false;

                String goalId = dbGoal.getGoalId();
                String targetType = dbGoal.getTargetType();
                Double targetValue = dbGoal.getTargetValue();
                String comparison = dbGoal.getComparison();

                // Calculate current value based on goal type
                if ("nature_percentage".equals(targetType)) {
                    // Nature percentage goal
                    if (typeBreakdown.containsKey("nature")) {
                        currentValue = typeBreakdown.get("nature").getPercentage();
                    }
                } else if ("commercial_percentage".equals(targetType)) {
                    // Commercial percentage of buildings goal
                    double commercialArea = 0.0;
                    if (typeBreakdown.containsKey("commercial building")) {
                        commercialArea = typeBreakdown.get("commercial building").getArea();
                    }

                    // Calculate total building area
                    String[] buildingTypes = {"detached house", "townhouse", "apartment", "commercial building", "covered parking space"};
                    double totalBuildingArea = 0.0;
                    for (String buildingType : buildingTypes) {
                        if (typeBreakdown.containsKey(buildingType)) {
                            totalBuildingArea += typeBreakdown.get(buildingType).getArea();
                        }
                    }

                    if (totalBuildingArea > 0) {
                        currentValue = (commercialArea / totalBuildingArea) * 100.0;
                    }
                } else if ("residents_count".equals(targetType)) {
                    // Residents count goal - only count residential building types
                    String[] residentialTypes = {"detached house", "townhouse", "apartment"};
                    for (String resType : residentialTypes) {
                        if (typeBreakdown.containsKey(resType)) {
                            currentValue += typeBreakdown.get(resType).getPeople();
                        }
                    }
                } else if ("workers_count".equals(targetType)) {
                    // Workers count goal - only count commercial building people
                    if (typeBreakdown.containsKey("commercial building")) {
                        currentValue = typeBreakdown.get("commercial building").getPeople();
                    }
                } else if ("people_count".equals(targetType)) {
                    // Legacy people count goal (all people)
                    for (Map.Entry<String, OccupationResponse.TypeOccupation> entry : typeBreakdown.entrySet()) {
                        currentValue += entry.getValue().getPeople();
                    }
                }

                // Check if goal is achieved
                if ("min".equalsIgnoreCase(comparison)) {
                    achieved = currentValue >= targetValue;
                } else if ("max".equalsIgnoreCase(comparison)) {
                    achieved = currentValue <= targetValue;
                }

                goals.add(new GoalCheckResponse.Goal(
                        goalId,
                        dbGoal.getDescription(),
                        achieved,
                        currentValue,
                        targetValue,
                        comparison
                ));
            }
        }

        return new GoalCheckResponse(goals);
    }
}