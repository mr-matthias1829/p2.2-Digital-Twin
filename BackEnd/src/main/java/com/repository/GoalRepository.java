package com.repository;

import com.model.Goal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * DATABASE ACCESS LAYER: GoalRepository
 * 
 * Provides database operations for the goals table.
 * Spring Data JPA automatically implements these methods.
 * 
 * How it works:
 * 1. Extends JpaRepository - gives us CRUD operations for free
 * 2. Spring generates SQL queries automatically based on method names
 * 3. No need to write SQL - Spring handles all database communication
 */
@Repository
public interface GoalRepository extends JpaRepository<Goal, Long> {
    
    // Custom query method: Find a goal by its unique goalId string
    // Spring automatically generates: SELECT * FROM goals WHERE goal_id = ?
    Optional<Goal> findByGoalId(String goalId);
}
