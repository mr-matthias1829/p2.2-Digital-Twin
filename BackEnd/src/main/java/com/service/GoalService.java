package com.service;

import com.model.Goal;

import java.util.List;
import java.util.Optional;

/**
 * SERVICE LAYER: GoalService Interface
 * 
 * Defines business operations for managing goals.
 * This layer sits between the controller (API) and repository (database).
 * 
 * Why use a service layer?
 * - Separates business logic from database access
 * - Makes code testable and maintainable
 * - Can add validation, logging, or other logic here
 */
public interface GoalService {
    // Retrieve all goals from database
    List<Goal> getAllGoals();
    
    // Find goal by database ID (auto-increment number)
    Optional<Goal> getGoalById(Long id);
    
    // Find goal by custom goalId string (e.g., "nature_min")
    Optional<Goal> getGoalByGoalId(String goalId);
    
    // Create new goal or update existing goal in database
    Goal saveGoal(Goal goal);
    
    // Delete goal from database by ID
    void deleteGoal(Long id);
}
