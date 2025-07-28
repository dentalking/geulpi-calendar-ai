package com.geulpi.calendar.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "oauth2_tokens", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "provider"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EntityListeners(AuditingEntityListener.class)
public class OAuth2Token {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "id", nullable = false)
    private User user;
    
    @Column(name = "provider", nullable = false)
    private String provider; // "google"
    
    @Column(name = "access_token", nullable = false, columnDefinition = "TEXT")
    private String accessToken;
    
    @Column(name = "refresh_token", columnDefinition = "TEXT")
    private String refreshToken;
    
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
    
    @Column(name = "scope", columnDefinition = "TEXT")
    private String scope;
    
    @Column(name = "token_type")
    private String tokenType; // "Bearer"
    
    @CreatedDate
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }
}