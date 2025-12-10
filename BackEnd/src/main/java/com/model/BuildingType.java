package com.model;

import jakarta.persistence.*;

@Entity
@Table(name = "building_types")
public class BuildingType {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String typeId;  // e.g., "commercial building", "nature", etc.
    
    @Column(nullable = false)
    private String colorHex;  // Color in hex format, e.g., "#039BE5"
    
    @Column(nullable = false)
    private Double cost;  // In euro, per cubic meter
    
    @Column(nullable = false)
    private Double income;  // % of cost as financial income per unit
    
    @Column(nullable = false)
    private Double people;  // Amount of home owners or workers per unit
    
    @Column(nullable = false)
    private Double livability;  // Score for livability on a scale of 1 to 10
    
    // Constructors
    public BuildingType() {
    }
    
    public BuildingType(String typeId, String colorHex, Double cost, Double income, Double people, Double livability) {
        this.typeId = typeId;
        this.colorHex = colorHex;
        this.cost = cost;
        this.income = income;
        this.people = people;
        this.livability = livability;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getTypeId() {
        return typeId;
    }
    
    public void setTypeId(String typeId) {
        this.typeId = typeId;
    }
    
    public String getColorHex() {
        return colorHex;
    }
    
    public void setColorHex(String colorHex) {
        this.colorHex = colorHex;
    }
    
    public Double getCost() {
        return cost;
    }
    
    public void setCost(Double cost) {
        this.cost = cost;
    }
    
    public Double getIncome() {
        return income;
    }
    
    public void setIncome(Double income) {
        this.income = income;
    }
    
    public Double getPeople() {
        return people;
    }
    
    public void setPeople(Double people) {
        this.people = people;
    }
    
    public Double getLivability() {
        return livability;
    }
    
    public void setLivability(Double livability) {
        this.livability = livability;
    }
}
