package com.service;

import com.dto.CalculationRequest;
import com.dto.CalculationResponse;
import com.dto.OccupationRequest;
import com.dto.OccupationResponse;
import com.dto.GoalCheckResponse;

public interface CalculationService {
    CalculationResponse calculateAreaAndVolume(CalculationRequest request);
    OccupationResponse calculateOccupation(OccupationRequest request);
    GoalCheckResponse checkGoals(OccupationRequest request);
}
