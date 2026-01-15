package com.service;

import com.model.Corridor;
import com.repository.CorridorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CorridorServiceImpl implements CorridorService {
    
    @Autowired
    private CorridorRepository corridorRepository;
    
    @Override
    public List<Corridor> getAllCorridors() {
        return corridorRepository.findAll();
    }
    
    @Override
    public Corridor getCorridorById(Long id) {
        return corridorRepository.findById(id).orElse(null);
    }
    
    @Override
    public Corridor saveCorridor(Corridor corridor) {
        return corridorRepository.save(corridor);
    }
    
    @Override
    public void deleteCorridor(Long id) {
        corridorRepository.deleteById(id);
    }
    
    @Override
    public void deleteAllCorridors() {
        corridorRepository.deleteAll();
    }
}
