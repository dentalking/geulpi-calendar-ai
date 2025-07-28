package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.converter.DateListConverter;
import com.geulpi.calendar.domain.converter.DayOfWeekListConverter;
import com.geulpi.calendar.domain.enums.DayOfWeek;
import com.geulpi.calendar.domain.enums.RecurrenceFrequency;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "recurrence_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecurrenceRule {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecurrenceFrequency frequency;
    
    @Column(nullable = false)
    @Builder.Default
    private Integer interval = 1;
    
    @Convert(converter = DayOfWeekListConverter.class)
    @Column(columnDefinition = "text")
    @Builder.Default
    private List<DayOfWeek> daysOfWeek = new ArrayList<>();
    
    private LocalDate endDate;
    
    @Convert(converter = DateListConverter.class)
    @Column(columnDefinition = "text")
    @Builder.Default
    private List<LocalDate> exceptions = new ArrayList<>();
    
    @OneToOne
    @JoinColumn(name = "event_id")
    private Event event;
}