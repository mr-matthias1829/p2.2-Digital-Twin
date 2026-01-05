package com.model;

import jakarta.persistence.*;

@Entity
@Table(name = "goals")
public class Goal {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String goalId;  // e.g., "nature_min", "commercial_max", "people_min"
    
    @Column(nullable = false)
    private String description;  // e.g., "Minimum 20% nature"
    
    @Column(nullable = false)
    private Double targetValue;  // The target value (e.g., 20.0, 3000.0)
    
    @Column(nullable = false)
    private String comparison;  // "min" or "max"
    
    @Column(nullable = false)
    private Boolean enabled = true;  // Whether this goal is active
    
    @Column
    private String targetType;  // What to measure: "percentage", "nature_percentage", "commercial_percentage", "people_count"
    
    // Constructors
    public Goal() {
    }
    
    public Goal(String goalId, String description, Double targetValue, String comparison, String targetType) {
        this.goalId = goalId;
        this.description = description;
        this.targetValue = targetValue;
        this.comparison = comparison;
        this.targetType = targetType;
        this.enabled = true;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getGoalId() {
        return goalId;
    }
    
    public void setGoalId(String goalId) {
        this.goalId = goalId;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public Double getTargetValue() {
        return targetValue;
    }
    
    public void setTargetValue(Double targetValue) {
        this.targetValue = targetValue;
    }
    
    public String getComparison() {
        return comparison;
    }
    
    public void setComparison(String comparison) {
        this.comparison = comparison;
    }
    
    public Boolean getEnabled() {
        return enabled;
    }
    
    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
    
    public String getTargetType() {
        return targetType;
    }
    
    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }
}
