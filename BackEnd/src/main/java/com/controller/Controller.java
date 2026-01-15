package com.controller;

import com.dto.CalculationRequest;
import com.dto.CalculationResponse;
import com.dto.OccupationRequest;
import com.dto.OccupationResponse;
import com.dto.GoalCheckResponse;
import com.dto.PolygonDataResponse;
import com.model.BuildingType;
import com.model.Corridor;
import com.model.Goal;
import com.model.Model;
import com.model.Polygon;
import com.service.BuildingTypeService;
import com.service.CalculationService;
import com.service.CorridorService;
import com.service.CorridorDataService;
import com.service.GoalService;
import com.service.ModelService;
import com.service.PolygonService;
import com.service.PolygonDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/data")
@CrossOrigin(origins = "*")
public class Controller {

    private static final Logger logger = LoggerFactory.getLogger(Controller.class);

    @Autowired
    private PolygonService polygonService;

    @Autowired
    private ModelService modelService;

    @Autowired
    private CalculationService calculationService;

    @Autowired
    private BuildingTypeService buildingTypeService;

    @Autowired
    private PolygonDataService polygonDataService;

    @Autowired
    private CorridorService corridorService;

    @Autowired
    private CorridorDataService corridorDataService;

    @Autowired
    private GoalService goalService;

    // GET ALL polygons AND models in one response
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllData() {
        List<Polygon> polygons = polygonService.getAllPolygons();
        List<Model> models = modelService.getAllModels();

        Map<String, Object> response = new HashMap<>();
        response.put("polygons", polygons);
        response.put("models", models);

        return ResponseEntity.ok(response);
    }

    // ========== POLYGON ENDPOINTS ==========

    @GetMapping("/polygons")
    public ResponseEntity<List<Polygon>> getAllPolygons() {
        List<Polygon> polygons = polygonService.getAllPolygons();
        return ResponseEntity.ok(polygons);
    }

    // ========== BUILDING TYPE ENDPOINTS ==========

    @GetMapping("/building-types")
    public ResponseEntity<List<BuildingType>> getAllBuildingTypes() {
        List<BuildingType> buildingTypes = buildingTypeService.getAllBuildingTypes();
        return ResponseEntity.ok(buildingTypes);
    }

    @GetMapping("/building-types/{id}")
    public ResponseEntity<BuildingType> getBuildingTypeById(@PathVariable Long id) {
        return buildingTypeService.getBuildingTypeById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/building-types/type/{typeId}")
    public ResponseEntity<BuildingType> getBuildingTypeByTypeId(@PathVariable String typeId) {
        return buildingTypeService.getBuildingTypeByTypeId(typeId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/building-types")
    public ResponseEntity<BuildingType> createBuildingType(@RequestBody BuildingType buildingType) {
        BuildingType savedType = buildingTypeService.saveBuildingType(buildingType);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedType);
    }

    @DeleteMapping("/building-types/{id}")
    public ResponseEntity<Void> deleteBuildingType(@PathVariable Long id) {
        buildingTypeService.deleteBuildingType(id);
        return ResponseEntity.noContent().build();
    }

    // ========== POLYGON DATA ENDPOINTS ==========

    @GetMapping("/polygons/{id}")
    public ResponseEntity<Polygon> getPolygonById(@PathVariable Long id) {
        Polygon polygon = polygonService.getPolygonById(id);
        if (polygon != null) {
            return ResponseEntity.ok(polygon);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/polygons")
    public ResponseEntity<Polygon> createPolygon(@RequestBody Polygon polygon) {
        try {
            logger.info("Creating new polygon with {} coordinates", 
                       polygon.getCoordinates() != null ? polygon.getCoordinates().size() : 0);
            
            // Ensure height has a default value
            if (polygon.getHeight() == null) {
                polygon.setHeight(0.0);
            }
            
            // Ensure bidirectional relationship is set
            if (polygon.getCoordinates() != null) {
                for (com.model.Coordinate coord : polygon.getCoordinates()) {
                    coord.setPolygon(polygon);
                }
            }
            Polygon savedPolygon = polygonService.savePolygon(polygon);
            logger.info("Successfully created polygon with ID: {}", savedPolygon.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(savedPolygon);
        } catch (Exception e) {
            logger.error("Error creating polygon: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/polygons/{id}")
    public ResponseEntity<Polygon> updatePolygon(@PathVariable Long id, @RequestBody Polygon polygon) {
        try {
            logger.info("Updating polygon with ID: {}", id);
            
            Polygon existingPolygon = polygonService.getPolygonById(id);
            if (existingPolygon == null) {
                logger.warn("Polygon not found with ID: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            // Update existing polygon properties
            existingPolygon.setHeight(polygon.getHeight() != null ? polygon.getHeight() : 0.0);
            existingPolygon.setBuildingType(polygon.getBuildingType());
            existingPolygon.setName(polygon.getName());
            existingPolygon.setHasNatureOnTop(polygon.getHasNatureOnTop() != null ? polygon.getHasNatureOnTop() : false);
            
            // Clear existing coordinates and add new ones
            existingPolygon.getCoordinates().clear();
            if (polygon.getCoordinates() != null) {
                logger.info("Updating with {} coordinates", polygon.getCoordinates().size());
                for (com.model.Coordinate coord : polygon.getCoordinates()) {
                    coord.setPolygon(existingPolygon);
                    existingPolygon.getCoordinates().add(coord);
                }
            }
            
            Polygon updatedPolygon = polygonService.savePolygon(existingPolygon);
            logger.info("Successfully updated polygon with ID: {}", updatedPolygon.getId());
            return ResponseEntity.ok(updatedPolygon);
        } catch (Exception e) {
            logger.error("Error updating polygon {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/polygons/{id}")
    public ResponseEntity<Void> deletePolygon(@PathVariable Long id) {
        polygonService.deletePolygon(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/polygons")
    public ResponseEntity<Void> deleteAllPolygons() {
        polygonService.deleteAllPolygons();
        return ResponseEntity.noContent().build();
    }

    // ========== MODEL ENDPOINTS ==========

    @GetMapping("/models")
    public ResponseEntity<List<Model>> getAllModels() {
        List<Model> models = modelService.getAllModels();
        return ResponseEntity.ok(models);
    }

    @GetMapping("/models/{id}")
    public ResponseEntity<Model> getModelById(@PathVariable Long id) {
        Model model = modelService.getModelById(id);
        if (model != null) {
            return ResponseEntity.ok(model);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/models")
    public ResponseEntity<Model> createModel(@RequestBody Model model) {
        Model savedModel = modelService.saveModel(model);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedModel);
    }

    @DeleteMapping("/models/{id}")
    public ResponseEntity<Void> deleteModel(@PathVariable Long id) {
        modelService.deleteModel(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/models")
    public ResponseEntity<Void> deleteAllModels() {
        modelService.deleteAllModels();
        return ResponseEntity.noContent().build();
    }




    // POST calculate area and volume
    //hi
    @PostMapping("/calculate")
    public ResponseEntity<CalculationResponse> calculateAreaAndVolume(@RequestBody CalculationRequest request) {
        CalculationResponse response = calculationService.calculateAreaAndVolume(request);
        return ResponseEntity.ok(response);
    }

    // POST calculate occupation percentage
    @PostMapping("/occupation")
    public ResponseEntity<OccupationResponse> calculateOccupation(@RequestBody OccupationRequest request) {
        OccupationResponse response = calculationService.calculateOccupation(request);
        return ResponseEntity.ok(response);
    }

    // POST check goals
    @PostMapping("/goals")
    public ResponseEntity<GoalCheckResponse> checkGoals(@RequestBody OccupationRequest request) {
        GoalCheckResponse response = calculationService.checkGoals(request);
        return ResponseEntity.ok(response);
    }

    // GET polygon data (cost, income, people, livability)
    @GetMapping("/polygons/{id}/data")
    public ResponseEntity<PolygonDataResponse> getPolygonData(
            @PathVariable Long id,
            @RequestParam(required = false) Double area,
            @RequestParam(required = false) Double volume) {
        try {
            PolygonDataResponse data = polygonDataService.calculatePolygonData(id, area, volume);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            logger.error("Error calculating polygon data for ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========== CORRIDOR ENDPOINTS ==========

    @GetMapping("/corridors")
    public ResponseEntity<List<Corridor>> getAllCorridors() {
        List<Corridor> corridors = corridorService.getAllCorridors();
        return ResponseEntity.ok(corridors);
    }

    @GetMapping("/corridors/{id}")
    public ResponseEntity<Corridor> getCorridorById(@PathVariable Long id) {
        Corridor corridor = corridorService.getCorridorById(id);
        if (corridor != null) {
            return ResponseEntity.ok(corridor);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/corridors")
    public ResponseEntity<Corridor> createCorridor(@RequestBody Corridor corridor) {
        try {
            logger.info("Creating new corridor with {} coordinates", 
                       corridor.getCoordinates() != null ? corridor.getCoordinates().size() : 0);
            
            // Ensure width has a default value
            if (corridor.getWidth() == null) {
                corridor.setWidth(3.0);
            }
            
            // Ensure bidirectional relationship is set
            if (corridor.getCoordinates() != null) {
                for (com.model.CorridorCoordinate coord : corridor.getCoordinates()) {
                    coord.setCorridor(corridor);
                }
            }
            Corridor savedCorridor = corridorService.saveCorridor(corridor);
            logger.info("Successfully created corridor with ID: {}", savedCorridor.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(savedCorridor);
        } catch (Exception e) {
            logger.error("Error creating corridor: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PutMapping("/corridors/{id}")
    public ResponseEntity<Corridor> updateCorridor(@PathVariable Long id, @RequestBody Corridor corridor) {
        try {
            logger.info("Updating corridor with ID: {}", id);
            
            Corridor existingCorridor = corridorService.getCorridorById(id);
            if (existingCorridor == null) {
                logger.warn("Corridor not found with ID: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            // Update existing corridor properties
            existingCorridor.setWidth(corridor.getWidth() != null ? corridor.getWidth() : 3.0);
            existingCorridor.setBuildingType(corridor.getBuildingType());
            existingCorridor.setName(corridor.getName());
            
            // Clear existing coordinates and add new ones
            existingCorridor.getCoordinates().clear();
            if (corridor.getCoordinates() != null) {
                logger.info("Updating with {} coordinates", corridor.getCoordinates().size());
                for (com.model.CorridorCoordinate coord : corridor.getCoordinates()) {
                    coord.setCorridor(existingCorridor);
                    existingCorridor.getCoordinates().add(coord);
                }
            }
            
            Corridor updatedCorridor = corridorService.saveCorridor(existingCorridor);
            logger.info("Successfully updated corridor with ID: {}", updatedCorridor.getId());
            return ResponseEntity.ok(updatedCorridor);
        } catch (Exception e) {
            logger.error("Error updating corridor {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @DeleteMapping("/corridors/{id}")
    public ResponseEntity<Void> deleteCorridor(@PathVariable Long id) {
        corridorService.deleteCorridor(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/corridors")
    public ResponseEntity<Void> deleteAllCorridors() {
        corridorService.deleteAllCorridors();
        return ResponseEntity.noContent().build();
    }

    // GET corridor data (cost, income, people, livability)
    @GetMapping("/corridors/{id}/data")
    public ResponseEntity<PolygonDataResponse> getCorridorData(
            @PathVariable Long id,
            @RequestParam(required = false) Double length) {
        try {
            PolygonDataResponse data = corridorDataService.calculateCorridorData(id, length);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            logger.error("Error calculating corridor data for ID {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========== GOAL ENDPOINTS ==========
    // REST API for managing goals in the database

    /**
     * GET /api/data/goals-config
     * 
     * Retrieve all goals from database.
     * Frontend calls this to display current goal configuration.
     */
    @GetMapping("/goals-config")
    public ResponseEntity<List<Goal>> getAllGoals() {
        List<Goal> goals = goalService.getAllGoals();  // Query database
        return ResponseEntity.ok(goals);  // Return as JSON
    }

    /**
     * GET /api/data/goals-config/{id}
     * 
     * Retrieve a single goal by database ID.
     * Returns 404 if goal not found.
     */
    @GetMapping("/goals-config/{id}")
    public ResponseEntity<Goal> getGoalById(@PathVariable Long id) {
        return goalService.getGoalById(id)  // Query database
                .map(ResponseEntity::ok)  // If found, return 200 OK
                .orElse(ResponseEntity.notFound().build());  // If not found, return 404
    }

    /**
     * GET /api/data/goals-config/goalId/{goalId}
     * 
     * Retrieve a goal by its custom goalId string (e.g., "nature_min").
     * Returns 404 if goal not found.
     */
    @GetMapping("/goals-config/goalId/{goalId}")
    public ResponseEntity<Goal> getGoalByGoalId(@PathVariable String goalId) {
        return goalService.getGoalByGoalId(goalId)  // Query database
                .map(ResponseEntity::ok)  // If found, return 200 OK
                .orElse(ResponseEntity.notFound().build());  // If not found, return 404
    }

    /**
     * POST /api/data/goals-config
     * 
     * Create a new goal in the database.
     * Request body should contain goal JSON (without id).
     * Returns the created goal with assigned ID.
     */
    @PostMapping("/goals-config")
    public ResponseEntity<Goal> createGoal(@RequestBody Goal goal) {
        Goal savedGoal = goalService.saveGoal(goal);  // INSERT into database
        return ResponseEntity.status(HttpStatus.CREATED).body(savedGoal);  // Return 201 Created
    }

    /**
     * PUT /api/data/goals-config/{id}
     * 
     * Update an existing goal in the database.
     * Request body should contain complete goal JSON.
     * Returns 404 if goal doesn't exist.
     */
    @PutMapping("/goals-config/{id}")
    public ResponseEntity<Goal> updateGoal(@PathVariable Long id, @RequestBody Goal goal) {
        return goalService.getGoalById(id)  // Check if goal exists
                .map(existingGoal -> {
                    goal.setId(id);  // Ensure ID matches URL parameter
                    Goal updatedGoal = goalService.saveGoal(goal);  // UPDATE in database
                    return ResponseEntity.ok(updatedGoal);  // Return 200 OK
                })
                .orElse(ResponseEntity.notFound().build());  // Return 404 if not found
    }

    /**
     * DELETE /api/data/goals-config/{id}
     * 
     * Delete a goal from the database.
     * Returns 204 No Content on success.
     */
    @DeleteMapping("/goals-config/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable Long id) {
        goalService.deleteGoal(id);  // DELETE from database
        return ResponseEntity.noContent().build();  // Return 204 No Content
    }
}