// Polygon.java
package com.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "polygons")
public class Polygon {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToMany(mappedBy = "polygon", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<Coordinate> coordinates = new ArrayList<>();
    
    @Column(nullable = false)
    private Double height;
    
    @Column(name = "building_type")
    private String buildingType;  // References BuildingType.typeId (e.g., "commercial building", "nature", etc.)

    // Constructors
    public Polygon() {
        this.height = 0.0;
    }

    public Polygon(List<Coordinate> coordinates, Double height, String buildingType) {
        this.coordinates = coordinates;
        this.height = height;
        this.buildingType = buildingType;
    }

    // Getters and Setters
    public Long getId() { 
        return id; 
    }
    
    public void setId(Long id) { 
        this.id = id; 
    }

    public List<Coordinate> getCoordinates() { 
        return coordinates; 
    }
    
    public void setCoordinates(List<Coordinate> coordinates) { 
        this.coordinates = coordinates;
        // Set parent reference for bidirectional relationship
        if (coordinates != null) {
            for (Coordinate coord : coordinates) {
                coord.setPolygon(this);
            }
        }
    }

    public Double getHeight() { 
        return height; 
    }
    
    public void setHeight(Double height) { 
        this.height = height; 
    }

    public String getBuildingType() { 
        return buildingType; 
    }
    
    public void setBuildingType(String buildingType) { 
        this.buildingType = buildingType; 
    }

    // Helper method to add a coordinate
    public void addCoordinate(Coordinate coordinate) {
        coordinates.add(coordinate);
        coordinate.setPolygon(this);
    }
}