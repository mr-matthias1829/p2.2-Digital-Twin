package com.digitaltwin.spoordok.dto;

public class OccupationResponse {
    private Double spoordokArea;
    private Double occupiedArea;
    private Double occupationPercentage;

    public OccupationResponse() {}

    public OccupationResponse(Double spoordokArea, Double occupiedArea, Double occupationPercentage) {
        this.spoordokArea = spoordokArea;
        this.occupiedArea = occupiedArea;
        this.occupationPercentage = occupationPercentage;
    }

    public Double getSpoordokArea() {
        return spoordokArea;
    }

    public void setSpoordokArea(Double spoordokArea) {
        this.spoordokArea = spoordokArea;
    }

    public Double getOccupiedArea() {
        return occupiedArea;
    }

    public void setOccupiedArea(Double occupiedArea) {
        this.occupiedArea = occupiedArea;
    }

    public Double getOccupationPercentage() {
        return occupationPercentage;
    }

    public void setOccupationPercentage(Double occupationPercentage) {
        this.occupationPercentage = occupationPercentage;
    }
}
