package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.dto.CalculationRequest;
import com.digitaltwin.spoordok.dto.CalculationResponse;
import com.digitaltwin.spoordok.dto.OccupationRequest;
import com.digitaltwin.spoordok.dto.OccupationResponse;

public interface CalculationService {
    CalculationResponse calculateAreaAndVolume(CalculationRequest request);
    OccupationResponse calculateOccupation(OccupationRequest request);
}
