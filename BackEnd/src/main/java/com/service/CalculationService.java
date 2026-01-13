package com.service;

import com.dto.CalculationRequest;
import com.dto.CalculationResponse;
import com.dto.OccupationRequest;
import com.dto.OccupationResponse;
import com.dto.GoalCheckResponse;

/**
 * Service for performing calculations on polygons and city planning metrics.
 * Handles area, volume, occupation, and goal checking calculations.
 */
public interface CalculationService {
    /**
     * Calculates the area and volume of a polygon.
     *
     * @param request the calculation request with polygon positions and height
     * @return the calculated area and volume
     */
    CalculationResponse calculateAreaAndVolume(CalculationRequest request);
    
    /**
     * Calculates occupation metrics for all polygons.
     * Includes cost, income, people, and livability totals.
     *
     * @param request the occupation request with polygon data
     * @return occupation metrics for the entire city plan
     */
    OccupationResponse calculateOccupation(OccupationRequest request);
    
    /**
     * Checks if city planning goals are met.
     *
     * @param request the occupation request with polygon data
     * @return goal check results with status for each goal
     */
    GoalCheckResponse checkGoals(OccupationRequest request);
}
