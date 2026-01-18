package com.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

/**
 * Represents a single coordinate point in a corridor's path.
 */
@Entity
@Table(name = "corridor_coordinates")
public class CorridorCoordinate {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "corridor_id", nullable = false)
    @JsonBackReference
    private Corridor corridor;
    
    @Column(nullable = false)
    private Double longitude;
    
    @Column(nullable = false)
    private Double latitude;
    
    @Column(nullable = false)
    private Double altitude;
    
    @Column(name = "sequence_order", nullable = false)
    private Integer sequenceOrder;

    public CorridorCoordinate() {
    }

    public CorridorCoordinate(Double longitude, Double latitude, Double altitude, Integer sequenceOrder) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.altitude = altitude;
        this.sequenceOrder = sequenceOrder;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Corridor getCorridor() {
        return corridor;
    }

    public void setCorridor(Corridor corridor) {
        this.corridor = corridor;
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

    public Double getAlitude() {
        return altitude;
    }

    public void setAltitude(Double altitude) {
        this.altitude = altitude;
    }

    public Integer getSequenceOrder() {
        return sequenceOrder;
    }

    public void setSequenceOrder(Integer sequenceOrder) {
        this.sequenceOrder = sequenceOrder;
    }
}
