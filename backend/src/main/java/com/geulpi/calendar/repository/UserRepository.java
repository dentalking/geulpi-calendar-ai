package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.lifePhilosophy LEFT JOIN FETCH u.preferences WHERE u.id = :id")
    Optional<User> findByIdWithDetails(String id);
    
    boolean existsByEmail(String email);
}