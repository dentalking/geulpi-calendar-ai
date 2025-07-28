package com.geulpi.calendar.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyncResult {
    private Boolean success;
    private Integer eventsImported;
    private Integer eventsUpdated;
    private List<String> errors;
    private LocalDateTime lastSyncAt;
}