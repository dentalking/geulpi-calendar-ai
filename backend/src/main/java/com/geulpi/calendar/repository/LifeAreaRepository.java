package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.LifeArea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LifeAreaRepository extends JpaRepository<LifeArea, String> {
    List<LifeArea> findByLifePhilosophyUserId(String userId);
    
    Optional<LifeArea> findByLifePhilosophyUserIdAndName(String userId, String name);
}