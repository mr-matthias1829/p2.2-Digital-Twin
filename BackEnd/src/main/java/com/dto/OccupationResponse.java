package com.dto;

import java.util.Map;

/**
 * Data Transfer Object for land occupation analysis results.
 * Contains area metrics and breakdown by polygon types.
 */
public class OccupationResponse {
    /**
     * Total area of the Spoordok (railroad dock) boundary in square meters.
     */
    private Double spoordokArea;
    
    /**
     * Total occupied area within the Spoordok boundary in square meters.
     */
    private Double occupiedArea;
    
    /**
     * Percentage of the Spoordok area that is occupied (0-100).
     */
    private Double occupationPercentage;
    
    /**
     * Breakdown of occupation by polygon type, mapping type name to its occupation metrics.
     */
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

    /**
     * Represents occupation metrics for a specific polygon type.
     * Contains area, percentage, and associated population count.
     */
    public static class TypeOccupation {
        /**
         * Total area occupied by this polygon type in square meters.
         */
        private Double area;
        
        /**
         * Percentage of total occupied area represented by this type (0-100).
         */
        private Double percentage;
        
        /**
         * Number of people associated with this polygon type.
         */
        private Double people;

        public TypeOccupation() {}

        public TypeOccupation(Double area, Double percentage) {
            this.area = area;
            this.percentage = percentage;
            this.people = 0.0;
        }

        public TypeOccupation(Double area, Double percentage, Double people) {
            this.area = area;
            this.percentage = percentage;
            this.people = people;
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

        public Double getPeople() {
            return people;
        }

        public void setPeople(Double people) {
            this.people = people;
        }
    }
}
