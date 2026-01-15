package com.service;

import com.dto.PolygonDataResponse;

public interface CorridorDataService {
    PolygonDataResponse calculateCorridorData(Long corridorId, Double length);
}
