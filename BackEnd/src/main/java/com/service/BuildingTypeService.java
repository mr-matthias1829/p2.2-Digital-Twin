package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.model.BuildingType;

import java.util.List;
import java.util.Optional;

public interface BuildingTypeService {
    List<BuildingType> getAllBuildingTypes();
    Optional<BuildingType> getBuildingTypeById(Long id);
    Optional<BuildingType> getBuildingTypeByTypeId(String typeId);
    BuildingType saveBuildingType(BuildingType buildingType);
    void deleteBuildingType(Long id);
}
