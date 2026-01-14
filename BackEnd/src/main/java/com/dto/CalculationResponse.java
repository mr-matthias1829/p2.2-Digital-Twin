package com.dto;

/**
 * Data Transfer Object for polygon calculation results.
 * Contains the computed area, volume, and height of a polygon.
 */
public class CalculationResponse {
    /**
     * Calculated area of the polygon in square meters.
     */
    private Double area;
    
    /**
     * Calculated volume of the polygon in cubic meters.
     */
    private Double volume;
    
    /**
     * Height of the polygon in meters.
     */
    private Double height;

    public CalculationResponse() {}

    public CalculationResponse(Double area, Double volume, Double height) {
        this.area = area;
        this.volume = volume;
        this.height = height;
    }

    public Double getArea() {
        return area;
    }

    public void setArea(Double area) {
        this.area = area;
    }

    public Double getVolume() {
        return volume;
    }

    public void setVolume(Double volume) {
        this.volume = volume;
    }

    public Double getHeight() {
        return height;
    }

    public void setHeight(Double height) {
        this.height = height;
    }
}
