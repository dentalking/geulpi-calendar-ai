package com.geulpi.calendar.domain.entity;

import com.geulpi.calendar.domain.converter.DayOfWeekListConverter;
import com.geulpi.calendar.domain.enums.DayOfWeek;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.Arrays;
import java.util.List;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkingHours {
    @Column(nullable = false)
    private LocalTime start;
    
    @Column(nullable = false)
    private LocalTime end;
    
    @Column(nullable = false)
    @Builder.Default
    private String timezone = "Asia/Seoul";
    
    @Convert(converter = DayOfWeekListConverter.class)
    @Column(columnDefinition = "text")
    @Builder.Default
    private List<DayOfWeek> workDays = Arrays.asList(
        DayOfWeek.MONDAY,
        DayOfWeek.TUESDAY,
        DayOfWeek.WEDNESDAY,
        DayOfWeek.THURSDAY,
        DayOfWeek.FRIDAY
    );
}