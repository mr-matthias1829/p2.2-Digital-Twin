package com.service;

import com.model.Goal;

import java.util.List;
import java.util.Optional;

public interface GoalService {
    List<Goal> getAllGoals();
    Optional<Goal> getGoalById(Long id);
    Optional<Goal> getGoalByGoalId(String goalId);
    Goal saveGoal(Goal goal);
    void deleteGoal(Long id);
}
