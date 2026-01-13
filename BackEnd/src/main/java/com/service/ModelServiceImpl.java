package com.service;

import com.model.Model;
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

    // Temporary in-memory storage (to be replaced with database)
    private final Map<Long, Model> modelStore = new HashMap<>();
    private final AtomicLong idCounter = new AtomicLong(1);

    @Override
    public Model saveModel(Model model) {
        if (model.getId() == null) {
            model.setId(idCounter.getAndIncrement());
        }
        modelStore.put(model.getId(), model);
        return model;
    }

    @Override
    public List<Model> getAllModels() {
        return new ArrayList<>(modelStore.values());
    }

    @Override
    public Model getModelById(Long id) {
        return modelStore.get(id);
    }

    @Override
    public void deleteModel(Long id) {
        modelStore.remove(id);
    }

    @Override
    public void deleteAllModels() {
        modelStore.clear();
    }
}