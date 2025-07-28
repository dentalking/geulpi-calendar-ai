package com.geulpi.calendar.domain.entity;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TimeSlot {
    private LocalDateTime start;
    private LocalDateTime end;
    private Boolean available;
}