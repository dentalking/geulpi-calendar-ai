package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.converter.JsonConverter;
import com.geulpi.calendar.domain.converter.TimeSlotListConverter;
import com.geulpi.calendar.domain.enums.Priority;
import com.geulpi.calendar.domain.enums.SuggestionStatus;
import com.geulpi.calendar.domain.enums.SuggestionType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "suggestions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Suggestion {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SuggestionType type;
    
    @Column(nullable = false)
    private String title;
    
    @Column(length = 1000, nullable = false)
    private String description;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "proposed_event_id")
    private Event proposedEvent;
    
    @Convert(converter = JsonConverter.class)
    @Column(columnDefinition = "TEXT")
    private Map<String, Object> proposedChanges;
    
    @Convert(converter = TimeSlotListConverter.class)
    @Column(columnDefinition = "text")
    @Builder.Default
    private List<TimeSlot> alternativeSlots = new ArrayList<>();
    
    @Column(length = 1000, nullable = false)
    private String reasoning;
    
    @OneToOne(mappedBy = "suggestion", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private ImpactAnalysis impact;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;
    
    private LocalDateTime expiresAt;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private SuggestionStatus status = SuggestionStatus.PENDING;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "insight_id")
    private Insight insight;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}