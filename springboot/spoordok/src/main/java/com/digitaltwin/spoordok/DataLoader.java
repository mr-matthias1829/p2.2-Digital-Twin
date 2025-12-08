package com.digitaltwin.spoordok;

import com.digitaltwin.spoordok.model.Coordinate;
import com.digitaltwin.spoordok.model.Model;
import com.digitaltwin.spoordok.model.Polygon;
import com.digitaltwin.spoordok.model.PolygonType;
import com.digitaltwin.spoordok.service.ModelService;
import com.digitaltwin.spoordok.service.PolygonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private PolygonService polygonService;

    //e

    @Autowired
    private ModelService modelService;

    @Override
    public void run(String... args) throws Exception {
        boolean hasPolygons = polygonService.getAllPolygons() != null && !polygonService.getAllPolygons().isEmpty();
        boolean hasModels = modelService.getAllModels() != null && !modelService.getAllModels().isEmpty();

        if (!hasPolygons && !hasModels) {
            // Dummy Polygon 1: Vrijstaand huis
            Polygon house1 = new Polygon();
            house1.setCoordinates(Arrays.asList(
                    new Coordinate(5.7953, 53.2012),
                    new Coordinate(5.7960, 53.2012),
                    new Coordinate(5.7960, 53.2018),
                    new Coordinate(5.7953, 53.2018)
            ));
            house1.setHeight(15.0);
            house1.setType(PolygonType.VRIJSTAAND_HUIS);
            polygonService.savePolygon(house1);

            // Dummy Polygon 2: Park
            Polygon park = new Polygon();
            park.setCoordinates(Arrays.asList(
                    new Coordinate(5.7965, 53.2012),
                    new Coordinate(5.7975, 53.2012),
                    new Coordinate(5.7975, 53.2020),
                    new Coordinate(5.7965, 53.2020)
            ));
            park.setHeight(2.0);
            park.setType(PolygonType.PARK);
            polygonService.savePolygon(park);

            // Dummy Polygon 3: Appartement
            Polygon apartment = new Polygon();
            apartment.setCoordinates(Arrays.asList(
                    new Coordinate(5.7945, 53.2015),
                    new Coordinate(5.7950, 53.2015),
                    new Coordinate(5.7950, 53.2022),
                    new Coordinate(5.7945, 53.2022)
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