package com.controller;

import com.dto.CalculationRequest;
import com.dto.CalculationResponse;
import com.dto.OccupationRequest;
import com.dto.OccupationResponse;
import com.dto.GoalCheckResponse;
import com.model.BuildingType;
import com.model.Model;
import com.model.Polygon;
import com.service.BuildingTypeService;
import com.service.CalculationService;
import com.service.ModelService;
import com.service.PolygonService;
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
}