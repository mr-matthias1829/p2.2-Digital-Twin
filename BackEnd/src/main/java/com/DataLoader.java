package com;

import com.model.BuildingType;
import com.model.Goal;
import com.model.Model;
import com.service.BuildingTypeService;
import com.service.GoalService;
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

    @Autowired
    private GoalService goalService;

    @Override
    public void run(String... args) throws Exception {
        // Load building types FIRST (if not present)
        loadBuildingTypesIfNeeded();
        
        // Load goals if not present
        loadGoalsIfNeeded();
        
        // Polygons are now loaded from the database and managed by the frontend
        // No dummy data needed anymore
        System.out.println("✓ Application initialized. Polygons: " + polygonService.getAllPolygons().size() + 
                         ", Models: " + modelService.getAllModels().size());
    }

    private void loadBuildingTypesIfNeeded() {
        // Only load if table is empty
        if (buildingTypeService.getAllBuildingTypes().isEmpty()) {
            System.out.println("Initializing building types...");

            
            // Infrastructure and nature (use AREA)
            buildingTypeService.saveBuildingType(new BuildingType("nature", "#008000", 150.0, 0.0, 0.0, 10.0, "area"));
            buildingTypeService.saveBuildingType(new BuildingType("water", "#1E88E5", 300.0, 0.0, 0.0, 7.0, "area"));
            buildingTypeService.saveBuildingType(new BuildingType("road", "#A9A9A9", 100.0, 5.0, 0.0, 8.0, "area"));
            buildingTypeService.saveBuildingType(new BuildingType("parking space", "#78909C", 100.0, 10.0, 0.05, 6.0, "area"));
            buildingTypeService.saveBuildingType(new BuildingType("covered parking space", "#8D6E63", 1500.0, 15.0, 0.05, 10.0, "area"));
            
            // Residential buildings (use VOLUME)
            buildingTypeService.saveBuildingType(new BuildingType("detached house", "#E53935", 500.0, 12.0, 0.005, 4.0, "volume"));
            buildingTypeService.saveBuildingType(new BuildingType("townhouse", "#FB8C00", 400.0, 8.0, 0.01, 6.0, "volume"));
            buildingTypeService.saveBuildingType(new BuildingType("apartment", "#8E24AA", 300.0, 12.0, 0.006, 5.0, "volume"));
            
            // Commercial buildings (use VOLUME)
            buildingTypeService.saveBuildingType(new BuildingType("commercial building", "#039BE5", 200.0, 15.0, 0.018, 2.0, "volume"));
            
            System.out.println("✓ Loaded 10 building types");
        } else {
            System.out.println("✓ Building types already present (" + buildingTypeService.getAllBuildingTypes().size() + " types)");
        }
    }

    private void loadGoalsIfNeeded() {
        // Only load if table is empty
        if (goalService.getAllGoals().isEmpty()) {
            System.out.println("Initializing goals...");

            // Goal 1: Minimum 20% nature
            goalService.saveGoal(new Goal(
                "nature_min",
                "Minimum 20% nature",
                20.0,
                "min",
                "nature_percentage"
            ));

            // Goal 2: Maximum 20% commercial building of total buildings
            goalService.saveGoal(new Goal(
                "commercial_max",
                "Maximum 20% commercial building of total buildings",
                20.0,
                "max",
                "commercial_percentage"
            ));

            // Goal 3: Minimum 3000 residents (people living)
            goalService.saveGoal(new Goal(
                "residents_min",
                "Minimum 3000 people living in the area",
                3000.0,
                "min",
                "residents_count"
            ));

            // Goal 4: Minimum 500 workers (commercial buildings)
            goalService.saveGoal(new Goal(
                "workers_min",
                "Minimum 500 people working in commercial buildings",
                500.0,
                "min",
                "workers_count"
            ));

            // Goal 5: Minimum 4500 parking spaces (covered and non-covered combined)
            goalService.saveGoal(new Goal(
                "parking_min",
                "Minimum 4500 parking spaces",
                4500.0,
                "min",
                "parking_count"
            ));

            System.out.println("✓ Loaded 5 goals");
        } else {
            System.out.println("✓ Goals already present (" + goalService.getAllGoals().size() + " goals)");
        }
    }
}