package com.digitaltwin.spoordok.service;

import com.digitaltwin.spoordok.model.BuildingType;
import com.digitaltwin.spoordok.repository.BuildingTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BuildingTypeServiceImpl implements BuildingTypeService {

    @Autowired
    private BuildingTypeRepository buildingTypeRepository;

    @Override
    public List<BuildingType> getAllBuildingTypes() {
        return buildingTypeRepository.findAll();
    }

    @Override
    public Optional<BuildingType> getBuildingTypeById(Long id) {
        return buildingTypeRepository.findById(id);
    }

    @Override
    public Optional<BuildingType> getBuildingTypeByTypeId(String typeId) {
        return buildingTypeRepository.findByTypeId(typeId);
    }

    @Override
    public BuildingType saveBuildingType(BuildingType buildingType) {
        return buildingTypeRepository.save(buildingType);
    }

    @Override
    public void deleteBuildingType(Long id) {
        buildingTypeRepository.deleteById(id);
    }
}
