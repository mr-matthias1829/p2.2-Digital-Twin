package com.service;

import com.model.BuildingType;

import java.util.List;
import java.util.Optional;

/**
 * Service for managing building types.
 * Provides operations to create, read, update, and delete building type configurations.
 */
public interface BuildingTypeService {
    /**
     * Retrieves all building types from the database.
     *
     * @return list of all building types
     */
    List<BuildingType> getAllBuildingTypes();
    
    /**
     * Finds a building type by its database ID.
     *
     * @param id the building type ID
     * @return optional containing the building type if found
     */
    Optional<BuildingType> getBuildingTypeById(Long id);
    
    /**
     * Finds a building type by its unique type identifier.
     *
     * @param typeId the type identifier (e.g., "commercial building", "nature")
     * @return optional containing the building type if found
     */
    Optional<BuildingType> getBuildingTypeByTypeId(String typeId);
    
    /**
     * Saves a new building type or updates an existing one.
     *
     * @param buildingType the building type to save
     * @return the saved building type
     */
    BuildingType saveBuildingType(BuildingType buildingType);
    
    /**
     * Deletes a building type by its ID.
     *
     * @param id the building type ID to delete
     */
    void deleteBuildingType(Long id);
}
