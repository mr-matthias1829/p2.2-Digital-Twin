package com.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Table for storing models in the database.
 */
@Entity
@Table(name = "models")
public class Model {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToMany(mappedBy = "model", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JsonManagedReference
    private List<ModelCoordinate> modelCoordinates = new ArrayList<>();

    @Column(nullable = false)
    private Double height;

    @Column(nullable = false)
    private Double rotation;

    @Column(nullable = false)
    private Double scale;

    @Column(name = "type")
    private String type;

    @Column(name = "personality")
    private String personality;

    @Column(name = "model_key")
    private String modelKey; // Reference to preloaded model (e.g., "tree", "building", "man")

    // Constructors

    /**
     * Gives default values to the model upon placing.
     */
    public Model() {
        this.height = 0.0;
        this.rotation = 0.0;
        this.scale = 1.0;
        this.type = "DEFAULT";
    }

    public Model(Double height, Double rotation,
                 Double scale, String type, String modelKey) {
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

    public List<ModelCoordinate> getModelCoordinates() {
        return modelCoordinates;
    }

    public void setModelCoordinates(List<ModelCoordinate> modelCoordinates) {
        this.modelCoordinates = modelCoordinates;
        if (modelCoordinates != null) {
            for (ModelCoordinate modelCoordinate : modelCoordinates) {
                modelCoordinate.setModel(this);
            }
        }
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

    public String getPersonality() {
        return personality;
    }

    public void setPersonality(String personality) {
        this.personality = personality;
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
                ", height=" + height +
                ", rotation=" + rotation +
                ", scale=" + scale +
                ", type='" + type + '\'' +
                ", modelKey='" + modelKey + '\'' +
                '}';
    }
}