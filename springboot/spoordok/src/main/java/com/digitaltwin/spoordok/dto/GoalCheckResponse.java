package com.digitaltwin.spoordok.dto;

import java.util.List;

public class GoalCheckResponse {
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

    public static class Goal {
        private String id;
        private String description;
        private boolean achieved;
        private Double currentValue;
        private Double targetValue;
        private String comparison; // "min" or "max"

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
