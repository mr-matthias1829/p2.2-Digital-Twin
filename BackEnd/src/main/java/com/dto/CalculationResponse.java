package com.digitaltwin.spoordok.dto;

public class CalculationResponse {
    private Double area;
    private Double volume;
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
