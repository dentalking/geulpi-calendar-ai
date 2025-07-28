package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.enums.Priority;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "time_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeRule {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String schedule; // Cron expression
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "area_id", nullable = false)
    private LifeArea area;
    
    @Column(nullable = false)
    private Integer duration; // minutes
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "life_philosophy_id")
    private LifePhilosophy lifePhilosophy;
}