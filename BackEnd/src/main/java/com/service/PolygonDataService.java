package com.service;

import com.dto.PolygonDataResponse;

/**
 * Service for calculating polygon-specific data like cost, income, people, and livability.
 * Calculations are based on the building type and either area or volume.
 */
public interface PolygonDataService {
    
    /**
     * Calculate all data metrics for a polygon.
     * 
     * @param polygonId The ID of the polygon
     * @param area The area of the polygon in m²
     * @param volume The volume of the polygon in m³ (can be null)
     * @return PolygonDataResponse containing cost, income, people, and livability
     */
    PolygonDataResponse calculatePolygonData(Long polygonId, Double area, Double volume);
}
