package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.model.Polygon;
import java.util.List;

public interface PolygonService {
    Polygon savePolygon(Polygon polygon);
    List<Polygon> getAllPolygons();
    Polygon getPolygonById(Long id);
    void deletePolygon(Long id);
    void deleteAllPolygons();
}