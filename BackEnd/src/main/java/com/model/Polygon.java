// Polygon.java
package com.model;

import java.util.List;

public class Polygon {
    private Long id;
    private List<Coordinate> coordinates;
    private double height;
    private PolygonType type;


    public Polygon() {}

    public Polygon(Long id, List<Coordinate> coordinates, double height, PolygonType type) {
        this.id = id;
        this.coordinates = coordinates;
        this.height = height;
        this.type = type;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public List<Coordinate> getCoordinates() { return coordinates; }
    public void setCoordinates(List<Coordinate> coordinates) { this.coordinates = coordinates; }

    public double getHeight() { return height; }
    public void setHeight(double height) { this.height = height; }

    public PolygonType getType() { return type; }
    public void setType(PolygonType type) { this.type = type; }

    // Berekent volume (voor kengetallen)
    public double getVolume() {
        // Simpele benadering: oppervlakte * hoogte
        // Je zou hier een betere oppervlakte-berekening kunnen doen
        return calculateArea() * height;
    }

    private double calculateArea() {
        // Placeholder
        return 100.0; // m²
    }
}