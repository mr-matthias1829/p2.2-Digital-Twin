package com.digitaltwin.spoordok.controller;

import com.digitaltwin.spoordok.dto.CalculationRequest;
import com.digitaltwin.spoordok.dto.CalculationResponse;
import com.digitaltwin.spoordok.dto.OccupationRequest;
import com.digitaltwin.spoordok.dto.OccupationResponse;
import com.digitaltwin.spoordok.dto.GoalCheckResponse;
import com.digitaltwin.spoordok.model.BuildingType;
import com.digitaltwin.spoordok.model.Model;
import com.digitaltwin.spoordok.model.Polygon;
import com.digitaltwin.spoordok.service.BuildingTypeService;
import com.digitaltwin.spoordok.service.CalculationService;
import com.digitaltwin.spoordok.service.ModelService;
import com.digitaltwin.spoordok.service.PolygonService;
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
        Polygon savedPolygon = polygonService.savePolygon(polygon);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPolygon);
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