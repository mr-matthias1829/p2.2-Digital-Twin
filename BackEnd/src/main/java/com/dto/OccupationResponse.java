package com.digitaltwin.spoordok.dto;

import java.util.Map;

public class OccupationResponse {
    private Double spoordokArea;
    private Double occupiedArea;
    private Double occupationPercentage;
    private Map<String, TypeOccupation> typeBreakdown;

    public OccupationResponse() {}

    public OccupationResponse(Double spoordokArea, Double occupiedArea, Double occupationPercentage, Map<String, TypeOccupation> typeBreakdown) {
        this.spoordokArea = spoordokArea;
        this.occupiedArea = occupiedArea;
        this.occupationPercentage = occupationPercentage;
        this.typeBreakdown = typeBreakdown;
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

    public Map<String, TypeOccupation> getTypeBreakdown() {
        return typeBreakdown;
    }

    public void setTypeBreakdown(Map<String, TypeOccupation> typeBreakdown) {
        this.typeBreakdown = typeBreakdown;
    }

    public static class TypeOccupation {
        private Double area;
        private Double percentage;

        public TypeOccupation() {}

        public TypeOccupation(Double area, Double percentage) {
            this.area = area;
            this.percentage = percentage;
        }

        public Double getArea() {
            return area;
        }

        public void setArea(Double area) {
            this.area = area;
        }

        public Double getPercentage() {
            return percentage;
        }

        public void setPercentage(Double percentage) {
            this.percentage = percentage;
        }
    }
}
