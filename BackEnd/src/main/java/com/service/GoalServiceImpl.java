package com.service;

import com.model.Goal;
import com.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * SERVICE LAYER IMPLEMENTATION: GoalServiceImpl
 * 
 * Implements the business logic for goal management.
 * All methods simply delegate to the repository (database layer).
 * 
 * DATABASE OPERATIONS:
 * - All operations automatically use transactions
 * - Changes are immediately saved to the database
 * - Spring handles connection pooling and error handling
 */
@Service
public class GoalServiceImpl implements GoalService {
    
    // Spring automatically injects the GoalRepository (database access)
    @Autowired
    private GoalRepository goalRepository;
    
    @Override
    public List<Goal> getAllGoals() {
        // Database query: SELECT * FROM goals
        return goalRepository.findAll();
    }
    
    @Override
    public Optional<Goal> getGoalById(Long id) {
        // Database query: SELECT * FROM goals WHERE id = ?
        return goalRepository.findById(id);
    }
    
    @Override
    public Optional<Goal> getGoalByGoalId(String goalId) {
        // Database query: SELECT * FROM goals WHERE goal_id = ?
        return goalRepository.findByGoalId(goalId);
    }
    
    @Override
    public Goal saveGoal(Goal goal) {
        // Database operation: INSERT (new) or UPDATE (existing)
        // Spring detects if goal.id exists in database
        return goalRepository.save(goal);
    }
    
    @Override
    public void deleteGoal(Long id) {
        // Database query: DELETE FROM goals WHERE id = ?
        goalRepository.deleteById(id);
    }
}
