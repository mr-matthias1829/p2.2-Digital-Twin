package com.digitaltwin.spoordok.dto;

import java.util.List;

public class CalculationRequest {
    private List<Position> positions;
    private Double height;

    public CalculationRequest() {}

    public CalculationRequest(List<Position> positions, Double height) {
        this.positions = positions;
        this.height = height;
    }

    public List<Position> getPositions() {
        return positions;
    }

    public void setPositions(List<Position> positions) {
        this.positions = positions;
    }

    public Double getHeight() {
        return height;
    }

    public void setHeight(Double height) {
        this.height = height;
    }

    public static class Position {
        private double x;
        private double y;
        private double z;

        public Position() {}

        public Position(double x, double y, double z) {
            this.x = x;
            this.y = y;
            this.z = z;
        }

        public double getX() {
            return x;
        }

        public void setX(double x) {
            this.x = x;
        }

        public double getY() {
            return y;
        }

        public void setY(double y) {
            this.y = y;
        }

        public double getZ() {
            return z;
        }

        public void setZ(double z) {
            this.z = z;
        }
    }
}
