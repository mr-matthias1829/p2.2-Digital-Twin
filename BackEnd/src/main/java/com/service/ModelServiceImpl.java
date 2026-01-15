package com.service;

import com.model.Model;
import com.repository.ModelRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Implementation of ModelService.
 * Currently uses in-memory storage (will be replaced with database later).
 */
@Service
public class ModelServiceImpl implements ModelService {

    // Tijdelijke opslag in geheugen (later vervangen door database)
    @Autowired
    private ModelRepository modelRepository;

    @Override
    public Model saveModel(Model model) {
        return modelRepository.save(model);
    }

    @Override
    public List<Model> getAllModels() {
        return modelRepository.findAll();
    }

    @Override
    public Model getModelById(Long id) {
        return modelRepository.findById(id).orElse(null);
    }

    @Override
    public void deleteModel(Long id) {
        modelRepository.deleteById(id);
    }

    @Override
    public void deleteAllModels() {
        modelRepository.deleteAll();
    }
}