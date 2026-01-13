package com.dto;

import java.util.List;

/**
 * Data Transfer Object for polygon calculation requests.
 * Contains the positions defining a polygon and its height for area and volume calculations.
 */
public class CalculationRequest {
    /**
     * List of 3D positions that define the polygon vertices.
     */
    private List<Position> positions;
    
    /**
     * Height of the polygon in meters, used for volume calculations.
     */
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

    /**
     * Represents a 3D position coordinate.
     * Used to define polygon vertices in 3D space.
     */
    public static class Position {
        /**
         * X coordinate in meters.
         */
        private double x;
        
        /**
         * Y coordinate in meters.
         */
        private double y;
        
        /**
         * Z coordinate (elevation) in meters.
         */
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
