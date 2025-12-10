package com.repository;

import com.model.BuildingType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BuildingTypeRepository extends JpaRepository<BuildingType, Long> {
    Optional<BuildingType> findByTypeId(String typeId);
}
