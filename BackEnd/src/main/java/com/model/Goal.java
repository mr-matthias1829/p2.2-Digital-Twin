package com.model;

import jakarta.persistence.*;

/**
 * DATABASE MODEL: Goal
 * 
 * Represents project goals stored in the database.
 * Each goal defines a target metric that the city plan should achieve.
 * 
 * DATABASE TABLE: goals
 * - Stores all configurable goals (nature %, residents, workers, etc.)
 * - Goals can be enabled/disabled dynamically
 * - Frontend fetches and displays goal progress in real-time
 */
@Entity
@Table(name = "goals")
public class Goal {
    
    // Auto-incrementing primary key in database
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    // Unique identifier for this goal (e.g., "nature_min", "commercial_max")
    @Column(nullable = false, unique = true)
    private String goalId;
    
    // Human-readable description shown in UI (e.g., "Minimum 20% nature")
    @Column(nullable = false)
    private String description;
    
    // The target value to achieve (e.g., 20.0 for 20%, 3000.0 for 3000 people)
    @Column(nullable = false)
    private Double targetValue;
    
    // Comparison type: "min" (must be at least) or "max" (must not exceed)
    @Column(nullable = false)
    private String comparison;
    
    // Whether this goal is currently active (can be toggled on/off)
    @Column(nullable = false)
    private Boolean enabled = true;
    
    // What metric to measure:
    // - "nature_percentage": % of nature coverage
    // - "commercial_percentage": % of commercial buildings
    // - "residents_count": Number of residents
    // - "workers_count": Number of workers
    // - "people_count": Total people (legacy)
    @Column
    private String targetType;
    
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
