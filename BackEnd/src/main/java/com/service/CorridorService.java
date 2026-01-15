package com.service;

import com.model.Corridor;
import java.util.List;

public interface CorridorService {
    List<Corridor> getAllCorridors();
    Corridor getCorridorById(Long id);
    Corridor saveCorridor(Corridor corridor);
    void deleteCorridor(Long id);
    void deleteAllCorridors();
}
