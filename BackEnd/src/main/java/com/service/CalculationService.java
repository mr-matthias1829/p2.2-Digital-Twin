package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.dto.CalculationRequest;
import com.digitaltwin.spoordok.dto.CalculationResponse;
import com.digitaltwin.spoordok.dto.OccupationRequest;
import com.digitaltwin.spoordok.dto.OccupationResponse;
import com.digitaltwin.spoordok.dto.GoalCheckResponse;

public interface CalculationService {
    CalculationResponse calculateAreaAndVolume(CalculationRequest request);
    OccupationResponse calculateOccupation(OccupationRequest request);
    GoalCheckResponse checkGoals(OccupationRequest request);
}
