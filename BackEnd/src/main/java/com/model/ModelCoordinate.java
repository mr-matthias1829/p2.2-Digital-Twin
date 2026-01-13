package com.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;

@Entity
@Table(name = "model_coordinates")
public class ModelCoordinate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Double modelLongitude;

    @Column(nullable = false)
    private Double modelLatitude;

    @ManyToOne
    @JoinColumn(name = "model_id")
    @JsonBackReference
    private Model model;

    public ModelCoordinate() {}

    public ModelCoordinate(Double modelLongitude, Double modelLatitude) {
        this.modelLongitude = modelLongitude;
        this.modelLatitude = modelLatitude;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Double getModelLongitude() { return modelLongitude; }

    public void setModelLongitude(Double modelLongitude) {
        this.modelLongitude = modelLongitude;
    }

    public Double getModelLatitude() {
        return modelLatitude;
    }

    public void setModelLatitude(Double modelLatitude) {
        this.modelLatitude = modelLatitude;
    }

    public Model getModel() {
        return model;
    }

    public void setModel(Model model) {
        this.model = model;
    }
}
