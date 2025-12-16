package com.service;

import com.model.Polygon;
import com.repository.PolygonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class PolygonServiceImpl implements PolygonService {

    @Autowired
    private PolygonRepository polygonRepository;

    @Override
    public Polygon savePolygon(Polygon polygon) {
        return polygonRepository.save(polygon);
    }

    @Override
    public List<Polygon> getAllPolygons() {
        return polygonRepository.findAll();
    }

    @Override
    public Polygon getPolygonById(Long id) {
        return polygonRepository.findById(id).orElse(null);
    }

    @Override
    public void deletePolygon(Long id) {
        polygonRepository.deleteById(id);
    }

    @Override
    public void deleteAllPolygons() {
        polygonRepository.deleteAll();
    }
}