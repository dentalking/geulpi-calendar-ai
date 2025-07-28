package com.geulpi.calendar.repository;

import com.geulpi.calendar.domain.entity.OAuth2Token;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OAuth2TokenRepository extends JpaRepository<OAuth2Token, String> {
    
    Optional<OAuth2Token> findByUserIdAndProvider(String userId, String provider);
    
    Optional<OAuth2Token> findFirstByUserIdOrderByCreatedAtDesc(String userId);
    
    void deleteByUserIdAndProvider(String userId, String provider);
}