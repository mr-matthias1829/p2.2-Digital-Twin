package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.model.Model;
import java.util.List;

public interface ModelService {
    Model saveModel(Model model);
    List<Model> getAllModels();
    Model getModelById(Long id);
    void deleteModel(Long id);
    void deleteAllModels();
}