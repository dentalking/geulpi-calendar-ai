package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.converter.TimeSlotListConverter;
import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "patterns")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pattern {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(length = 1000, nullable = false)
    private String description;
    
    @Column(nullable = false)
    private Float frequency;
    
    @Convert(converter = TimeSlotListConverter.class)
    @Column(columnDefinition = "text")
    @Builder.Default
    private List<TimeSlot> timeSlots = new ArrayList<>();
    
    @Column(nullable = false)
    private Float confidence;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}