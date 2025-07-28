package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.TimeSlot;
import com.geulpi.calendar.domain.enums.ChangeAction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProposedChange {
    private Event event;
    private ChangeAction action;
    private TimeSlot newTime;
    private String reason;
}