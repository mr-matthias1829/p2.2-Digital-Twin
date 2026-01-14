package com.dto;

import java.util.List;

/**
 * Data Transfer Object for goal checking results.
 * Contains a list of goals with their achievement status and values.
 */
public class GoalCheckResponse {
    /**
     * List of goals with their achievement status.
     */
    private List<Goal> goals;

    public GoalCheckResponse() {}

    public GoalCheckResponse(List<Goal> goals) {
        this.goals = goals;
    }

    public List<Goal> getGoals() {
        return goals;
    }

    public void setGoals(List<Goal> goals) {
        this.goals = goals;
    }

    /**
     * Represents a single goal with its achievement status.
     * Tracks whether a target value has been reached based on comparison criteria.
     */
    public static class Goal {
        /**
         * Unique identifier for the goal.
         */
        private String id;
        
        /**
         * Human-readable description of the goal.
         */
        private String description;
        
        /**
         * Indicates whether the goal has been achieved.
         */
        private boolean achieved;
        
        /**
         * Current value being measured for this goal.
         */
        private Double currentValue;
        
        /**
         * Target value that needs to be reached.
         */
        private Double targetValue;
        
        /**
         * Comparison type: "min" (current must be >= target) or "max" (current must be <= target).
         */
        private String comparison;

        public Goal() {}

        public Goal(String id, String description, boolean achieved, Double currentValue, Double targetValue, String comparison) {
            this.id = id;
            this.description = description;
            this.achieved = achieved;
            this.currentValue = currentValue;
            this.targetValue = targetValue;
            this.comparison = comparison;
        }

        public String getId() {
            return id;
        }

        public void setId(String id) {
            this.id = id;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public boolean isAchieved() {
            return achieved;
        }

        public void setAchieved(boolean achieved) {
            this.achieved = achieved;
        }

        public Double getCurrentValue() {
            return currentValue;
        }

        public void setCurrentValue(Double currentValue) {
            this.currentValue = currentValue;
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
    }
}
