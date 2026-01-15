package com.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * Represents a corridor (road/path) in the digital twin system.
 * Similar to Polygon but for linear features.
 */
@Entity
@Table(name = "corridors")
public class Corridor {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToMany(mappedBy = "corridor", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<CorridorCoordinate> coordinates = new ArrayList<>();
    
    @Column(name = "width")
    private Double width;
    
    @Column(name = "building_type")
    private String buildingType;

    @Column(name = "name")
    private String name;

    public Corridor() {
        this.width = 3.0; // Default 3m width
    }

    public Corridor(List<CorridorCoordinate> coordinates, Double width, String buildingType) {
        this.coordinates = coordinates;
        this.width = width;
        this.buildingType = buildingType;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public List<CorridorCoordinate> getCoordinates() {
        return coordinates;
    }

    public void setCoordinates(List<CorridorCoordinate> coordinates) {
        this.coordinates = coordinates;
    }

    public Double getWidth() {
        return width;
    }

    public void setWidth(Double width) {
        this.width = width;
    }

    public String getBuildingType() {
        return buildingType;
    }

    public void setBuildingType(String buildingType) {
        this.buildingType = buildingType;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
