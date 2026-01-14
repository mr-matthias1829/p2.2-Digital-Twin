package com.service;

import com.model.Model;
import java.util.List;

/**
 * Service for managing 3D model instances in the digital twin.
 * Handles saving, retrieving, and deleting positioned 3D models.
 */
public interface ModelService {
    /**
     * Saves a new model or updates an existing one.
     *
     * @param model the model to save
     * @return the saved model
     */
    Model saveModel(Model model);
    
    /**
     * Retrieves all models.
     *
     * @return list of all models
     */
    List<Model> getAllModels();
    
    /**
     * Finds a model by its ID.
     *
     * @param id the model ID
     * @return the model if found, null otherwise
     */
    Model getModelById(Long id);
    
    /**
     * Deletes a model by its ID.
     *
     * @param id the model ID to delete
     */
    void deleteModel(Long id);
    
    /**
     * Deletes all models.
     */
    void deleteAllModels();
}