package com.digitaltwin.spoordok.controller;

import com.digitaltwin.spoordok.model.Model;
import com.digitaltwin.spoordok.model.Polygon;
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
}