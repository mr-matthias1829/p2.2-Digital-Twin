package com.service;

import com.model.Goal;
import com.repository.GoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class GoalServiceImpl implements GoalService {
    
    @Autowired
    private GoalRepository goalRepository;
    
    @Override
    public List<Goal> getAllGoals() {
        return goalRepository.findAll();
    }
    
    @Override
    public Optional<Goal> getGoalById(Long id) {
        return goalRepository.findById(id);
    }
    
    @Override
    public Optional<Goal> getGoalByGoalId(String goalId) {
        return goalRepository.findByGoalId(goalId);
    }
    
    @Override
    public Goal saveGoal(Goal goal) {
        return goalRepository.save(goal);
    }
    
    @Override
    public void deleteGoal(Long id) {
        goalRepository.deleteById(id);
    }
}
