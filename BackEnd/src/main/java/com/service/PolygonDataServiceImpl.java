package com.service;

import com.dto.PolygonDataResponse;
import com.model.BuildingType;
import com.model.Polygon;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Service implementation for calculating polygon-specific data metrics.
 * Calculates cost, income, people, and livability based on building type and area/volume.
 */
@Service
public class PolygonDataServiceImpl implements PolygonDataService {
    
    private static final Logger logger = LoggerFactory.getLogger(PolygonDataServiceImpl.class);
    
    @Autowired
    private PolygonService polygonService;
    
    @Autowired
    private BuildingTypeService buildingTypeService;
    
    @Override
    public PolygonDataResponse calculatePolygonData(Long polygonId, Double area, Double volume) {
        // Get the polygon
        Polygon polygon = polygonService.getPolygonById(polygonId);
        if (polygon == null) {
            logger.warn("Polygon not found with ID: {}", polygonId);
            return new PolygonDataResponse(0.0, 0.0, 0.0, 0.0, 0.0, "unknown");
        }
        
        // Get the building type
        String buildingTypeId = polygon.getBuildingType();
        if (buildingTypeId == null || buildingTypeId.equals("none")) {
            logger.info("Polygon {} has no building type", polygonId);
            return new PolygonDataResponse(0.0, 0.0, 0.0, 0.0, 0.0, "none");
        }
        
        BuildingType buildingType = buildingTypeService.getBuildingTypeByTypeId(buildingTypeId)
            .orElse(null);
        
        if (buildingType == null) {
            logger.warn("Building type not found: {}", buildingTypeId);
            return new PolygonDataResponse(0.0, 0.0, 0.0, 0.0, 0.0, "unknown");
        }
        
        // Determine which measurement to use based on calculation base
        String calculationBase = buildingType.getCalculationBase();
        Double measurement;
        
        if ("area".equalsIgnoreCase(calculationBase)) {
            measurement = area;
        } else {
            // Default to volume
            measurement = volume;
            if (measurement == null || measurement == 0.0) {
                // If no height/volume, fall back to area
                measurement = area;
                calculationBase = "area";
            }
        }
        
        // Calculate metrics
        Double cost = buildingType.getCost() * measurement;
        Double income = cost * (buildingType.getIncome() / 100.0);  // Income is percentage
        Double people = buildingType.getPeople() * measurement;
        Double livability = buildingType.getLivability();  // Livability is a fixed score, not multiplied
        
        // Special calculation for covered parking: multiply by number of floors
        // Each 5 meters = 1 floor. At 5m: 1x, at 10m: 2x, etc.
        if ("covered parking space".equals(buildingTypeId)) {
            final double FLOOR_HEIGHT = 5.0;
            if (volume != null && volume > 0.0 && area != null && area > 0.0) {
                double height = volume / area;
                double numberOfFloors = Math.floor(height / FLOOR_HEIGHT);
                // Multiply by number of floors (at 5m = 1x, at 10m = 2x)
                people = people * numberOfFloors;
            }
        }
        
        logger.info("Calculated data for polygon {}: cost={}, income={}, people={}, livability={}, measurement={}, base={}", 
                   polygonId, cost, income, people, livability, measurement, calculationBase);
        
        return new PolygonDataResponse(cost, income, people, livability, measurement, calculationBase);
    }
}
