package com.dto;

import java.util.List;

/**
 * Data Transfer Object for land occupation analysis requests.
 * Contains the Spoordok boundary and polygon areas to analyze occupation percentages.
 */
public class OccupationRequest {
    /**
     * List of positions defining the Spoordok (railroad dock) boundary.
     */
    private List<CalculationRequest.Position> spoordokPositions;
    
    /**
     * List of polygon areas with their types and properties to analyze.
     */
    private List<PolygonArea> polygonAreas;

    public OccupationRequest() {}

    public OccupationRequest(List<CalculationRequest.Position> spoordokPositions, List<PolygonArea> polygonAreas) {
        this.spoordokPositions = spoordokPositions;
        this.polygonAreas = polygonAreas;
    }

    public List<CalculationRequest.Position> getSpoordokPositions() {
        return spoordokPositions;
    }

    public void setSpoordokPositions(List<CalculationRequest.Position> spoordokPositions) {
        this.spoordokPositions = spoordokPositions;
    }

    public List<PolygonArea> getPolygonAreas() {
        return polygonAreas;
    }

    public void setPolygonAreas(List<PolygonArea> polygonAreas) {
        this.polygonAreas = polygonAreas;
    }

    /**
     * Represents a polygon area with its properties.
     * Used for calculating occupation and area distribution by type.
     */
    public static class PolygonArea {
        /**
         * List of positions defining the polygon vertices.
         */
        private List<CalculationRequest.Position> positions;
        
        /**
         * Type of the polygon area (e.g., "residential", "commercial", "nature").
         */
        private String type;
        
        /**
         * Height of the polygon in meters.
         */
        private Double height;
        
        /**
         * Indicates whether there is nature (green space) on top of the polygon.
         */
        private Boolean hasNatureOnTop;

        public PolygonArea() {}

        public PolygonArea(List<CalculationRequest.Position> positions, String type) {
            this.positions = positions;
            this.type = type;
        }

        public PolygonArea(List<CalculationRequest.Position> positions, String type, Double height) {
            this.positions = positions;
            this.type = type;
            this.height = height;
        }

        public PolygonArea(List<CalculationRequest.Position> positions, String type, Double height, Boolean hasNatureOnTop) {
            this.positions = positions;
            this.type = type;
            this.height = height;
            this.hasNatureOnTop = hasNatureOnTop;
        }

        public List<CalculationRequest.Position> getPositions() {
            return positions;
        }

        public void setPositions(List<CalculationRequest.Position> positions) {
            this.positions = positions;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public Double getHeight() {
            return height;
        }

        public void setHeight(Double height) {
            this.height = height;
        }

        public Boolean getHasNatureOnTop() {
            return hasNatureOnTop;
        }

        public void setHasNatureOnTop(Boolean hasNatureOnTop) {
            this.hasNatureOnTop = hasNatureOnTop;
        }
    }
}
