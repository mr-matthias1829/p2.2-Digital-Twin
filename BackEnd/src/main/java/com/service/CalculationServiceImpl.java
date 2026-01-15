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

    /**
     * MAIN CALCULATION ENTRY POINT
     * 
     * Calculates area and optionally volume for a polygon:
     * 1. Validate that polygon has at least 3 vertices
     * 2. Calculate area using ENU projection + shoelace formula
     * 3. If height provided: volume = area × height
     */
    @Override
    public CalculationResponse calculateAreaAndVolume(CalculationRequest request) {
        List<CalculationRequest.Position> positions = request.getPositions();

        // Need at least 3 points to form a polygon
        if (positions == null || positions.size() < 3) {
            return new CalculationResponse(0.0, null, request.getHeight());
        }

        // STEP 1: Calculate base area in m²
        double area = calculateAreaFromPositions(positions);

        // STEP 2: Calculate volume if height is provided (simple extrusion)
        Double volume = null;
        if (request.getHeight() != null && request.getHeight() > 0) {
            volume = area * request.getHeight();  // m² × m = m³
        }

        return new CalculationResponse(area, volume, request.getHeight());
    }

    /**
     * AREA CALCULATION ALGORITHM
     * 
     * Compute planar polygon area in m² using:
     * 1. ENU (East-North-Up) projection - converts 3D Earth coords to flat 2D plane
     * 2. Shoelace formula - calculates area from 2D polygon vertices
     * 
     * Why ENU projection?
     * - Earth is curved, but buildings are flat
     * - ENU creates a local flat coordinate system around the polygon
     * - This gives accurate area measurements for geographic coordinates
     * 
     * Fallback: For testing, supports local XY coordinates directly
     */
    private double calculateAreaFromPositions(List<CalculationRequest.Position> positions) {
        if (positions == null || positions.size() < 3) {
            return 0.0;
        }

        // STEP 1: Find the center point (centroid) of the polygon
        // This becomes our reference point for the local coordinate system
        double cx = 0, cy = 0, cz = 0;
        for (var p : positions) {
            cx += p.getX();
            cy += p.getY();
            cz += p.getZ();
        }
        cx /= positions.size();  // Average of all X coordinates
        cy /= positions.size();  // Average of all Y coordinates
        cz /= positions.size();  // Average of all Z coordinates

        // STEP 2: Transform each vertex to local ENU coordinates
        // ENU = East-North-Up: a flat coordinate system at the centroid
        double[][] enu = new double[positions.size()][3];
        for (int i = 0; i < positions.size(); i++) {
            var p = positions.get(i);
            enu[i] = cartesianToLocalENU(
                    p.getX(), p.getY(), p.getZ(),  // Point to transform
                    cx, cy, cz                      // Reference point (centroid)
            );
        }

        // STEP 3: Calculate area using shoelace formula on the flat 2D plane
        double enuArea = shoelaceAreaXY(enu);

        // SAFETY FALLBACK: If ENU gives near-zero area, try local XY directly
        // (This only happens with test data that uses local coordinates)
        if (enuArea < 1e-6) {
            double[][] localXY = new double[positions.size()][3];
            for (int i = 0; i < positions.size(); i++) {
                var p = positions.get(i);
                localXY[i][0] = p.getX();
                localXY[i][1] = p.getY();
            }
            return shoelaceAreaXY(localXY);
        }

        return enuArea;  // Return area in square meters (m²)
    }

    /**
     * SHOELACE FORMULA (Surveyor's formula)
     * 
     * Calculates polygon area from vertices on a flat 2D plane.
     * Formula: Area = ½ × |Σ(x[i] × y[i+1] - x[i+1] × y[i])|
     * 
     * How it works:
     * - Takes each edge of the polygon
     * - Cross-multiplies coordinates of adjacent vertices
     * - Sums all cross products
     * - Takes absolute value and divides by 2
     */
    private double shoelaceAreaXY(double[][] pts) {
        double area = 0.0;
        
        // Loop through each edge of the polygon
        for (int i = 0; i < pts.length; i++) {
            double[] a = pts[i];                    // Current vertex
            double[] b = pts[(i + 1) % pts.length]; // Next vertex (wraps to first)
            
            // Cross product: x[i] × y[i+1] - x[i+1] × y[i]
            area += (a[0] * b[1] - b[0] * a[1]);
        }
        
        // Take absolute value and divide by 2 for final area
        return Math.abs(area) * 0.5;
    }



    /**
     * ENU COORDINATE TRANSFORMATION
     * 
     * Transforms 3D Earth coordinates (Cartesian3) to local flat plane coordinates.
     * Creates a tangent plane at the reference point with:
     * - East axis: pointing east
     * - North axis: pointing north
     * - Up axis: pointing away from Earth center
     * 
     * This converts curved Earth surface to flat 2D plane for accurate area calculation.
     */
    private double[] cartesianToLocalENU(double x, double y, double z,
                                         double refX, double refY, double refZ) {
        // STEP 1: Normalize the reference point to get "Up" direction
        // (direction from Earth center to reference point)
        double refLength = Math.sqrt(refX * refX + refY * refY + refZ * refZ);
        double normRefX = refX / refLength;
        double normRefY = refY / refLength;
        double normRefZ = refZ / refLength;

        // STEP 2: Calculate "East" direction
        // East is perpendicular to Up in the XY plane
        double eastLength = Math.sqrt(normRefX * normRefX + normRefY * normRefY);
        double eastX = -normRefY / eastLength;
        double eastY = normRefX / eastLength;
        double eastZ = 0.0;

        // STEP 3: Calculate "North" direction
        // North is perpendicular to both Up and East (cross product)
        double northX = -normRefZ * eastY;
        double northY = normRefZ * eastX;
        double northZ = normRefX * eastY - normRefY * eastX;

        // Normalize North vector to unit length
        double northLength = Math.sqrt(northX * northX + northY * northY + northZ * northZ);
        northX /= northLength;
        northY /= northLength;
        northZ /= northLength;

        // STEP 4: Transform the point to local ENU coordinates
        // Calculate offset from reference point
        double dx = x - refX;
        double dy = y - refY;
        double dz = z - refZ;

        // Project offset onto East, North, and Up axes (dot products)
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
        Map<String, Double> typePeople = new HashMap<>();  // Track people/parking spaces per type
        double natureOnTopArea = 0.0;  // Track nature on top separately (doesn't count for occupation)

        if (request.getPolygonAreas() != null) {
            for (OccupationRequest.PolygonArea polygon : request.getPolygonAreas()) {
                // Check if all vertices are inside the Spoordok polygon
                if (isPolygonInsideSpoordok(polygon.getPositions(), request.getSpoordokPositions())) {
                    // Use pre-calculated corridor area if provided, otherwise calculate from positions
                    double area = polygon.getCorridorArea() != null ? polygon.getCorridorArea() : calculateAreaFromPositions(polygon.getPositions());

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
                    
                    // Calculate people/parking spaces for THIS polygon
                    Optional<BuildingType> buildingTypeOpt = buildingTypeService.getBuildingTypeByTypeId(type);
                    if (buildingTypeOpt.isPresent()) {
                        BuildingType buildingType = buildingTypeOpt.get();
                        double measurement = area; // Default to area
                        
                        // Use volume if this type is volume-based
                        if ("volume".equalsIgnoreCase(buildingType.getCalculationBase()) && height != null && height > 0) {
                            measurement = area * height;
                        }
                        
                        double polygonPeople = buildingType.getPeople() * measurement;
                        
                        // For parking spaces: multiply by number of floors for THIS polygon
                        if ("parking space".equals(type) || "covered parking space".equals(type)) {
                            final double FLOOR_HEIGHT = 5.0;
                            if (height != null && height > 0) {
                                double numberOfFloors = Math.floor(height / FLOOR_HEIGHT);
                                polygonPeople = polygonPeople * numberOfFloors;
                            }
                        }
                        
                        // Add to running total for this type
                        typePeople.put(type, typePeople.getOrDefault(type, 0.0) + polygonPeople);
                    }
                }
            }
        }

        // Calculate percentage
        double occupationPercentage = (totalOccupiedArea / spoordokArea) * 100.0;

        // Build type breakdown
        Map<String, OccupationResponse.TypeOccupation> typeBreakdown = new HashMap<>();
        for (Map.Entry<String, Double> entry : typeAreas.entrySet()) {
            double typePercentage = (entry.getValue() / spoordokArea) * 100.0;
            String type = entry.getKey();
            double area = entry.getValue();
            double people = typePeople.getOrDefault(type, 0.0);

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

    /**
     * GOAL CHECKING SYSTEM
     * 
     * Checks if current city plan meets all configured goals from the database.
     * 
     * HOW IT WORKS:
     * 1. Calculate occupation (area breakdown by building type)
     * 2. Fetch all goals from database
     * 3. For each enabled goal:
     *    a. Calculate current value based on goal type
     *    b. Compare with target value (min/max)
     *    c. Determine if goal is achieved
     * 4. Return results to frontend for display
     * 
     * DATABASE INTEGRATION:
     * - Goals are stored in database, fetched on every check
     * - Can be updated through REST API without code changes
     * - Enabled/disabled status controls which goals are checked
     */
    @Override
    public GoalCheckResponse checkGoals(OccupationRequest request) {
        // STEP 1: Calculate current occupation statistics
        // This gives us area, volume, people count for each building type
        OccupationResponse occupation = calculateOccupation(request);

        List<GoalCheckResponse.Goal> goals = new ArrayList<>();

        // STEP 2: Fetch all goals from database
        // Database query: SELECT * FROM goals
        List<Goal> dbGoals = goalService.getAllGoals();

        if (occupation.getTypeBreakdown() != null) {
            Map<String, OccupationResponse.TypeOccupation> typeBreakdown = occupation.getTypeBreakdown();

            // STEP 3: Process each goal from database
            for (Goal dbGoal : dbGoals) {
                // Skip goals that are disabled in the database
                if (!dbGoal.getEnabled()) {
                    continue;
                }

                double currentValue = 0.0;  // Current metric value
                boolean achieved = false;    // Whether goal is met

                // Extract goal properties from database record
                String goalId = dbGoal.getGoalId();
                String targetType = dbGoal.getTargetType();
                Double targetValue = dbGoal.getTargetValue();
                String comparison = dbGoal.getComparison();

                // STEP 4: Calculate current value based on goal type
                // Each goal type measures a different metric from the occupation data
                
                if ("nature_percentage".equals(targetType)) {
                    // GOAL TYPE: Nature Percentage
                    // Measures: % of total area covered by nature
                    // Example: Goal = 20% nature minimum
                    if (typeBreakdown.containsKey("nature")) {
                        currentValue = typeBreakdown.get("nature").getPercentage();
                    }
                    
                } else if ("commercial_percentage".equals(targetType)) {
                    // GOAL TYPE: Commercial Percentage
                    // Measures: % of building area that is commercial
                    // Example: Goal = 15% commercial buildings minimum
                    double commercialArea = 0.0;
                    if (typeBreakdown.containsKey("commercial building")) {
                        commercialArea = typeBreakdown.get("commercial building").getArea();
                    }

                    // Sum up all building types (not including nature/water)
                    String[] buildingTypes = {"detached house", "townhouse", "apartment", "commercial building", "covered parking space"};
                    double totalBuildingArea = 0.0;
                    for (String buildingType : buildingTypes) {
                        if (typeBreakdown.containsKey(buildingType)) {
                            totalBuildingArea += typeBreakdown.get(buildingType).getArea();
                        }
                    }

                    // Calculate percentage: (commercial / total buildings) × 100
                    if (totalBuildingArea > 0) {
                        currentValue = (commercialArea / totalBuildingArea) * 100.0;
                    }
                    
                } else if ("residents_count".equals(targetType)) {
                    // GOAL TYPE: Residents Count
                    // Measures: Total number of people living in residential buildings
                    // Example: Goal = 3000 residents minimum
                    String[] residentialTypes = {"detached house", "townhouse", "apartment"};
                    for (String resType : residentialTypes) {
                        if (typeBreakdown.containsKey(resType)) {
                            currentValue += typeBreakdown.get(resType).getPeople();
                        }
                    }
                    
                } else if ("workers_count".equals(targetType)) {
                    // GOAL TYPE: Workers Count
                    // Measures: Number of people working in commercial buildings
                    // Example: Goal = 1000 workers minimum
                    if (typeBreakdown.containsKey("commercial building")) {
                        currentValue = typeBreakdown.get("commercial building").getPeople();
                    }
                    
                } else if ("parking_count".equals(targetType)) {
                    // GOAL TYPE: Parking Count
                    // Measures: Total number of parking spaces (covered + non-covered)
                    // Example: Goal = 4500 parking spaces minimum
                    if (typeBreakdown.containsKey("parking space")) {
                        currentValue += typeBreakdown.get("parking space").getPeople();
                    }
                    if (typeBreakdown.containsKey("covered parking space")) {
                        currentValue += typeBreakdown.get("covered parking space").getPeople();
                    }
                    
                } else if ("people_count".equals(targetType)) {
                    // GOAL TYPE: Total People (legacy)
                    // Measures: All people (residents + workers)
                    // Example: Goal = 4000 total people minimum
                    for (Map.Entry<String, OccupationResponse.TypeOccupation> entry : typeBreakdown.entrySet()) {
                        currentValue += entry.getValue().getPeople();
                    }
                }

                // STEP 5: Check if goal is achieved by comparing current vs target
                // Comparison type comes from database ("min" or "max")
                if ("min".equalsIgnoreCase(comparison)) {
                    // Minimum goal: current must be >= target
                    // Example: 25% nature >= 20% target = ACHIEVED
                    achieved = currentValue >= targetValue;
                } else if ("max".equalsIgnoreCase(comparison)) {
                    // Maximum goal: current must be <= target
                    // Example: 10% commercial <= 15% target = ACHIEVED
                    achieved = currentValue <= targetValue;
                }

                // STEP 6: Add goal result to response list
                // This will be sent to frontend as JSON
                goals.add(new GoalCheckResponse.Goal(
                        goalId,              // Unique ID (e.g., "nature_min")
                        dbGoal.getDescription(),  // Human-readable text
                        achieved,            // true/false if goal is met
                        currentValue,        // Current metric value
                        targetValue,         // Target from database
                        comparison           // "min" or "max"
                ));
            }
        }

        // STEP 7: Return all goal results to frontend
        // Frontend displays this as a list with green (achieved) or red (not achieved)
        return new GoalCheckResponse(goals);
    }
}