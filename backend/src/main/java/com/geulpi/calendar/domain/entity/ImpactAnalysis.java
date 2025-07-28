package com.geulpi.calendar.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "impact_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ImpactAnalysis {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private Float balanceImprovement;
    
    @Column(nullable = false)
    @Builder.Default
    private Boolean conflictResolution = false;
    
    @Column(nullable = false)
    private Float productivityGain;
    
    @ManyToMany
    @JoinTable(
        name = "impact_analysis_affected_events",
        joinColumns = @JoinColumn(name = "impact_analysis_id"),
        inverseJoinColumns = @JoinColumn(name = "event_id")
    )
    @Builder.Default
    private List<Event> affectedEvents = new ArrayList<>();
    
    @OneToOne
    @JoinColumn(name = "suggestion_id")
    private Suggestion suggestion;
}