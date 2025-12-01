package com.digitaltwin.spoordok.controller;

import com.digitaltwin.spoordok.model.Polygon;
import com.digitaltwin.spoordok.service.PolygonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/polygons")
@CrossOrigin(origins = "*") // Voor development - later specifieke origins toestaan
public class PolygonController {

    @Autowired
    private PolygonService polygonService;

    // GET alle polygons
    @GetMapping
    public ResponseEntity<List<Polygon>> getAllPolygons() {
        List<Polygon> polygons = polygonService.getAllPolygons();
        return ResponseEntity.ok(polygons);
    }

    // GET specifieke polygon
    @GetMapping("/{id}")
    public ResponseEntity<Polygon> getPolygonById(@PathVariable Long id) {
        Polygon polygon = polygonService.getPolygonById(id);
        if (polygon != null) {
            return ResponseEntity.ok(polygon);
        }
        return ResponseEntity.notFound().build();
    }

    // POST nieuwe polygon
    @PostMapping
    public ResponseEntity<Polygon> createPolygon(@RequestBody Polygon polygon) {
        Polygon savedPolygon = polygonService.savePolygon(polygon);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedPolygon);
    }

    // DELETE polygon
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePolygon(@PathVariable Long id) {
        polygonService.deletePolygon(id);
        return ResponseEntity.noContent().build();
    }

    // DELETE alle polygons
    @DeleteMapping
    public ResponseEntity<Void> deleteAllPolygons() {
        polygonService.deleteAllPolygons();
        return ResponseEntity.noContent().build();
    }
}