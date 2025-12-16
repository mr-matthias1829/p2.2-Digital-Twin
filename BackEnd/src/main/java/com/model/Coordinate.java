package com.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(name = "coordinates")
public class Coordinate {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Double longitude;
    
    @Column(nullable = false)
    private Double latitude;
    
    @ManyToOne
    @JoinColumn(name = "polygon_id")
    @JsonBackReference
    private Polygon polygon;

    // Constructors
    public Coordinate() {}

    public Coordinate(Double longitude, Double latitude) {
        this.longitude = longitude;
        this.latitude = latitude;
    }

    // Getters and Setters
    public Long getId() { 
        return id; 
    }
    
    public void setId(Long id) { 
        this.id = id; 
    }
    
    public Double getLongitude() { 
        return longitude; 
    }
    
    public void setLongitude(Double longitude) { 
        this.longitude = longitude; 
    }

    public Double getLatitude() { 
        return latitude; 
    }
    
    public void setLatitude(Double latitude) { 
        this.latitude = latitude; 
    }
    
    public Polygon getPolygon() { 
        return polygon; 
    }
    
    public void setPolygon(Polygon polygon) { 
        this.polygon = polygon; 
    }
}