package com.digitaltwin.spoordok;

import com.digitaltwin.spoordok.model.Coordinate;
import com.digitaltwin.spoordok.model.Polygon;
import com.digitaltwin.spoordok.model.PolygonType;
import com.digitaltwin.spoordok.service.PolygonService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private PolygonService polygonService;

    @Override
    public void run(String... args) throws Exception {
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

        System.out.println("✓ Dummy data geladen: 3 polygons");
    }
}