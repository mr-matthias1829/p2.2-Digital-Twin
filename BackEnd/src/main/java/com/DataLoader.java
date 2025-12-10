package com;

import com.model.BuildingType;
import com.model.Coordinate;
import com.model.Model;
import com.model.Polygon;
import com.model.PolygonType;
import com.service.BuildingTypeService;
import com.service.ModelService;
import com.service.PolygonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

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
        
        // Then load dummy polygons and models
        loadDummyDataIfNeeded();
    }

    private void loadBuildingTypesIfNeeded() {
        // Only load if table is empty
        if (buildingTypeService.getAllBuildingTypes().isEmpty()) {
            System.out.println("Initializing building types...");
            
            // Testing type
            buildingTypeService.saveBuildingType(new BuildingType("poly", "#808080", 0.0, 0.0, 0.0, 5.0));
            
            // Infrastructure and nature
            buildingTypeService.saveBuildingType(new BuildingType("nature", "#008000", 150.0, 0.0, 0.0, 10.0));
            buildingTypeService.saveBuildingType(new BuildingType("water", "#1E88E5", 300.0, 0.0, 0.0, 7.0));
            buildingTypeService.saveBuildingType(new BuildingType("road", "#A9A9A9", 100.0, 5.0, 0.0, 8.0));
            buildingTypeService.saveBuildingType(new BuildingType("parking space", "#78909C", 100.0, 10.0, 0.0, 6.0));
            buildingTypeService.saveBuildingType(new BuildingType("covered parking space", "#8D6E63", 1500.0, 15.0, 0.0, 10.0));
            
            // Residential buildings
            buildingTypeService.saveBuildingType(new BuildingType("detached house", "#E53935", 500.0, 12.0, 0.005, 4.0));
            buildingTypeService.saveBuildingType(new BuildingType("townhouse", "#FB8C00", 400.0, 8.0, 0.01, 6.0));
            buildingTypeService.saveBuildingType(new BuildingType("apartment", "#8E24AA", 300.0, 12.0, 0.006, 5.0));
            
            // Commercial buildings
            buildingTypeService.saveBuildingType(new BuildingType("commercial building", "#039BE5", 200.0, 15.0, 0.018, 2.0));
            
            System.out.println("✓ Loaded 10 building types");
        } else {
            System.out.println("✓ Building types already present (" + buildingTypeService.getAllBuildingTypes().size() + " types)");
        }
    }

    private void loadDummyDataIfNeeded() {
        boolean hasPolygons = polygonService.getAllPolygons() != null && !polygonService.getAllPolygons().isEmpty();
        boolean hasModels = modelService.getAllModels() != null && !modelService.getAllModels().isEmpty();

        if (!hasPolygons && !hasModels) {
            // Dummy Polygon 1: Vrijstaand huis
            Polygon house1 = new Polygon();
            house1.setCoordinates(Arrays.asList(
                    new Coordinate(5.785959, 53.195938),
                    new Coordinate(5.786659, 53.195938),
                    new Coordinate(5.786659, 53.196538),
                    new Coordinate(5.785959, 53.196538)
            ));
            house1.setHeight(15.0);
            house1.setType(PolygonType.VRIJSTAAND_HUIS);
            polygonService.savePolygon(house1);

            // Dummy Polygon 2: Park
            Polygon park = new Polygon();
            park.setCoordinates(Arrays.asList(
                    new Coordinate(5.787432, 53.196659),
                    new Coordinate(5.788432, 53.196659),
                    new Coordinate(5.788432, 53.197459),
                    new Coordinate(5.787432, 53.197459)
            ));
            park.setHeight(2.0);
            park.setType(PolygonType.PARK);
            polygonService.savePolygon(park);

            // Dummy Polygon 3: Appartement
            Polygon apartment = new Polygon();
            apartment.setCoordinates(Arrays.asList(
                    new Coordinate(5.783686, 53.196388),
                    new Coordinate(5.783980, 53.196145),
                    new Coordinate(5.784923, 53.196557),
                    new Coordinate(5.784629, 53.196800)
            ));
            apartment.setHeight(25.0);
            apartment.setType(PolygonType.APPARTEMENT);
            polygonService.savePolygon(apartment);

            // Dummy Model 1: Tree in the park
            Model tree1 = new Model();
            tree1.setLongitude(5.7970);
            tree1.setLatitude(53.2016);
            tree1.setHeight(0.0);
            tree1.setRotation(45.0);
            tree1.setScale(0.65);
            tree1.setType("nature");
            tree1.setModelKey("tree");
            modelService.saveModel(tree1);

            // Dummy Model 2: Another tree
            Model tree2 = new Model();
            tree2.setLongitude(5.7968);
            tree2.setLatitude(53.2014);
            tree2.setHeight(0.0);
            tree2.setRotation(120.0);
            tree2.setScale(0.65);
            tree2.setType("nature");
            tree2.setModelKey("tree");
            modelService.saveModel(tree2);

            // Dummy Model 3: Building near the house
            Model building = new Model();
            building.setLongitude(5.7957);
            building.setLatitude(53.2015);
            building.setHeight(0.0);
            building.setRotation(0.0);
            building.setScale(3.0);
            building.setType("detached_house");
            building.setModelKey("building");
            modelService.saveModel(building);

            // Dummy Model 4: Person walking
            Model person = new Model();
            person.setLongitude(5.7947);
            person.setLatitude(53.2018);
            person.setHeight(0.0);
            person.setRotation(90.0);
            person.setScale(1.0);
            person.setType("nature");
            person.setModelKey("man");
            modelService.saveModel(person);

            System.out.println("✓ Dummy data geladen: 3 polygons, 4 models");
        } else {
            System.out.println("✓ Store already contains data; skipping dummy load.");
        }
    }
}