package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.converter.StringListConverter;
import com.geulpi.calendar.domain.enums.CreatedBy;
import com.geulpi.calendar.domain.enums.EventSource;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(length = 1000)
    private String description;
    
    @Column(nullable = false)
    private LocalDateTime startTime;
    
    @Column(nullable = false)
    private LocalDateTime endTime;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean allDay = false;
    
    @OneToOne(mappedBy = "event", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private RecurrenceRule recurrence;
    
    @Column(nullable = false)
    @Builder.Default
    private String timezone = "Asia/Seoul";
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id", nullable = false)
    private LifeArea area;
    
    @Column(nullable = false)
    private Float aiConfidence;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventSource source;
    
    @OneToOne(mappedBy = "event", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private Location location;
    
    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "text")
    @Builder.Default
    private List<String> attendees = new ArrayList<>();
    
    private String googleEventId;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CreatedBy createdBy;
    
    @Column(nullable = false)
    private Float balanceImpact;
    
    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "text")
    @Builder.Default
    private List<String> tags = new ArrayList<>();
    
    private String color;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}