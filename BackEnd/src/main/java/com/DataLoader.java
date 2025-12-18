package com;

import com.model.BuildingType;
import com.model.Model;
import com.service.BuildingTypeService;
import com.service.ModelService;
import com.service.PolygonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private PolygonService polygonService;

    @Autowired
    private ModelService modelService;

    @Autowired
    private BuildingTypeService buildingTypeService;

    @Override
    public void run(String... args) throws Exception {
        // Load building types FIRST (if not present)
        loadBuildingTypesIfNeeded();
        
        // Polygons are now loaded from the database and managed by the frontend
        // No dummy data needed anymore
        System.out.println("✓ Application initialized. Polygons: " + polygonService.getAllPolygons().size() + 
                         ", Models: " + modelService.getAllModels().size());
    }

    private void loadBuildingTypesIfNeeded() {
        // Only load if table is empty
        if (buildingTypeService.getAllBuildingTypes().isEmpty()) {
            System.out.println("Initializing building types...");

            
            // Infrastructure and nature
            buildingTypeService.saveBuildingType(new BuildingType("nature", "#008000", 150.0, 0.0, 0.0, 10.0));
            buildingTypeService.saveBuildingType(new BuildingType("water", "#1E88E5", 300.0, 0.0, 0.0, 7.0));
            buildingTypeService.saveBuildingType(new BuildingType("road", "#A9A9A9", 100.0, 0.05, 0.0, 8.0));
            buildingTypeService.saveBuildingType(new BuildingType("parking space", "#78909C", 100.0, 0.10, 0.0, 6.0));
            buildingTypeService.saveBuildingType(new BuildingType("covered parking space", "#8D6E63", 1500.0, 0.15, 0.0, 10.0));
            
            // Residential buildings
            buildingTypeService.saveBuildingType(new BuildingType("detached house", "#E53935", 500.0, 0.12, 0.005, 4.0));
            buildingTypeService.saveBuildingType(new BuildingType("townhouse", "#FB8C00", 400.0, 0.08, 0.01, 6.0));
            buildingTypeService.saveBuildingType(new BuildingType("apartment", "#8E24AA", 300.0, 0.12, 0.006, 5.0));
            
            // Commercial buildings
            buildingTypeService.saveBuildingType(new BuildingType("commercial building", "#039BE5", 200.0, 0.15, 0.018, 2.0));
            
            System.out.println("✓ Loaded 10 building types");
        } else {
            System.out.println("✓ Building types already present (" + buildingTypeService.getAllBuildingTypes().size() + " types)");
        }
    }
}