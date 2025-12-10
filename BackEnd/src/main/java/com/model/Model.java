package com.digitaltwin.spoordok.model;

public class Model {
    private Long id;
    private Double longitude;
    private Double latitude;
    private Double height;
    private Double rotation;
    private Double scale;
    private String type;
    private String modelKey; // Reference to preloaded model (e.g., "tree", "building", "man")

    // Constructors
    public Model() {
        this.height = 0.0;
        this.rotation = 0.0;
        this.scale = 1.0;
        this.type = "DEFAULT";
    }

    public Model(Double longitude, Double latitude, Double height, Double rotation,
                 Double scale, String type, String modelKey) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.height = height;
        this.rotation = rotation;
        this.scale = scale;
        this.type = type;
        this.modelKey = modelKey;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public Double getHeight() {
        return height;
    }

    public void setHeight(Double height) {
        this.height = height;
    }

    public Double getRotation() {
        return rotation;
    }

    public void setRotation(Double rotation) {
        this.rotation = rotation;
    }

    public Double getScale() {
        return scale;
    }

    public void setScale(Double scale) {
        this.scale = scale;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getModelKey() {
        return modelKey;
    }

    public void setModelKey(String modelKey) {
        this.modelKey = modelKey;
    }

    @Override
    public String toString() {
        return "Model{" +
                "id=" + id +
                ", longitude=" + longitude +
                ", latitude=" + latitude +
                ", height=" + height +
                ", rotation=" + rotation +
                ", scale=" + scale +
                ", type='" + type + '\'' +
                ", modelKey='" + modelKey + '\'' +
                '}';
    }
}