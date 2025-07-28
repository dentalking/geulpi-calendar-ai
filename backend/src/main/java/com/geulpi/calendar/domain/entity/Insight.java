package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.converter.JsonConverter;
import com.geulpi.calendar.domain.enums.InsightType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "insights")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Insight {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InsightType type;
    
    @Column(length = 1000, nullable = false)
    private String content;
    
    @Column(columnDefinition = "jsonb")
    @Convert(converter = JsonConverter.class)
    private Map<String, Object> data;
    
    @Column(name = "impact_score", nullable = false)
    private Float impactScore;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean actionable = false;
    
    @OneToMany(mappedBy = "insight", cascade = CascadeType.ALL)
    @Builder.Default
    private List<Suggestion> suggestedActions = new ArrayList<>();
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @CreationTimestamp
    @Column(name = "generated_at", nullable = false, updatable = false)
    private LocalDateTime generatedAt;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private com.geulpi.calendar.domain.enums.Severity severity = com.geulpi.calendar.domain.enums.Severity.INFO;
    
    // Helper methods
    public String getDescription() {
        return content;
    }
    
    public boolean isActionable() {
        return actionable != null && actionable;
    }
    
    public com.geulpi.calendar.domain.enums.Severity getSeverity() {
        return severity != null ? severity : com.geulpi.calendar.domain.enums.Severity.INFO;
    }
}