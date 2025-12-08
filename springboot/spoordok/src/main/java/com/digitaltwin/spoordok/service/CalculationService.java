package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.dto.CalculationRequest;
import com.digitaltwin.spoordok.dto.CalculationResponse;

public interface CalculationService {
    CalculationResponse calculateAreaAndVolume(CalculationRequest request);
}
