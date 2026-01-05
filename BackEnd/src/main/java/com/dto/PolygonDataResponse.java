package com.dto;

/**
 * Response DTO for polygon data calculations.
 * Contains cost, income, people, and livability metrics.
 */
public class PolygonDataResponse {
    
    private Double cost;           // Total cost in euros
    private Double income;         // Total income in euros
    private Double people;         // Number of people (residents or workers)
    private Double livability;     // Livability score (1-10)
    private Double measurement;    // The area or volume used in calculation
    private String calculationBase; // "area" or "volume"
    
    // Constructors
    public PolygonDataResponse() {
    }
    
    public PolygonDataResponse(Double cost, Double income, Double people, Double livability, 
                               Double measurement, String calculationBase) {
        this.cost = cost;
        this.income = income;
        this.people = people;
        this.livability = livability;
        this.measurement = measurement;
        this.calculationBase = calculationBase;
    }
    
    // Getters and Setters
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
    
    public Double getMeasurement() {
        return measurement;
    }
    
    public void setMeasurement(Double measurement) {
        this.measurement = measurement;
    }
    
    public String getCalculationBase() {
        return calculationBase;
    }
    
    public void setCalculationBase(String calculationBase) {
        this.calculationBase = calculationBase;
    }
}
