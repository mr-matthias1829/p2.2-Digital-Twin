package com.service;

import com.dto.PolygonDataResponse;
import com.model.BuildingType;
import com.model.Corridor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Service for calculating corridor-specific data metrics.
 * Uses similar logic to polygon calculations but for linear features (roads/paths).
 */
@Service
public class CorridorDataServiceImpl implements CorridorDataService {
    
    private static final Logger logger = LoggerFactory.getLogger(CorridorDataServiceImpl.class);
    
    @Autowired
    private CorridorService corridorService;
    
    @Autowired
    private BuildingTypeService buildingTypeService;
    
    @Override
    public PolygonDataResponse calculateCorridorData(Long corridorId, Double length) {
        // Get the corridor
        Corridor corridor = corridorService.getCorridorById(corridorId);
        if (corridor == null) {
            logger.warn("Corridor not found with ID: {}", corridorId);
            return new PolygonDataResponse(0.0, 0.0, 0.0, 0.0, 0.0, "area");
        }
        
        // Get the building type
        String buildingTypeId = corridor.getBuildingType();
        if (buildingTypeId == null || buildingTypeId.equals("none")) {
            logger.info("Corridor {} has no building type", corridorId);
            return new PolygonDataResponse(0.0, 0.0, 0.0, 0.0, 0.0, "none");
        }
        
        BuildingType buildingType = buildingTypeService.getBuildingTypeByTypeId(buildingTypeId)
            .orElse(null);
        
        if (buildingType == null) {
            logger.warn("Building type not found: {}", buildingTypeId);
            return new PolygonDataResponse(0.0, 0.0, 0.0, 0.0, 0.0, "unknown");
        }
        
        // Calculate area: length * width
        Double width = corridor.getWidth() != null ? corridor.getWidth() : 3.0;
        Double area = length * width;
        
        // Calculate metrics (corridors use area-based calculations)
        Double cost = buildingType.getCost() * area;
        Double income = cost * (buildingType.getIncome() / 100.0);
        Double people = buildingType.getPeople() * area;
        Double livability = buildingType.getLivability();
        
        logger.info("Calculated data for corridor {}: cost={}, income={}, people={}, livability={}, area={}", 
                   corridorId, cost, income, people, livability, area);
        
        return new PolygonDataResponse(cost, income, people, livability, area, "area");
    }
}
