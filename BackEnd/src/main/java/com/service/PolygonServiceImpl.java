package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.model.Polygon;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class PolygonServiceImpl implements PolygonService {

    // Tijdelijke opslag in geheugen (later vervangen door database)
    private final Map<Long, Polygon> polygonStore = new HashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);

    @Override
    public Polygon savePolygon(Polygon polygon) {
        if (polygon.getId() == null) {
            polygon.setId(idCounter.getAndIncrement());
        }
        polygonStore.put(polygon.getId(), polygon);
        return polygon;
    }

    @Override
    public List<Polygon> getAllPolygons() {
        return new ArrayList<>(polygonStore.values());
    }

    @Override
    public Polygon getPolygonById(Long id) {
        return polygonStore.get(id);
    }

    @Override
    public void deletePolygon(Long id) {
        polygonStore.remove(id);
    }

    @Override
    public void deleteAllPolygons() {
        polygonStore.clear();
    }
}