package com.digitaltwin.spoordok.dto;

import java.util.List;

public class OccupationRequest {
    private List<CalculationRequest.Position> spoordokPositions;
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

    public static class PolygonArea {
        private List<CalculationRequest.Position> positions;

        public PolygonArea() {}

        public PolygonArea(List<CalculationRequest.Position> positions) {
            this.positions = positions;
        }

        public List<CalculationRequest.Position> getPositions() {
            return positions;
        }

        public void setPositions(List<CalculationRequest.Position> positions) {
            this.positions = positions;
        }
    }
}
