package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.entity.Event;
import java.time.LocalDateTime;

public class DashboardUpdate {
    private String updateType;
    private Event event;
    private TimeBalance timeBalance;
    private AIInsight insight;
    private LocalDateTime timestamp;

    public DashboardUpdate() {}

    public DashboardUpdate(String updateType, Event event, TimeBalance timeBalance, 
                          AIInsight insight, LocalDateTime timestamp) {
        this.updateType = updateType;
        this.event = event;
        this.timeBalance = timeBalance;
        this.insight = insight;
        this.timestamp = timestamp;
    }

    public String getUpdateType() { return updateType; }
    public void setUpdateType(String updateType) { this.updateType = updateType; }
    
    public Event getEvent() { return event; }
    public void setEvent(Event event) { this.event = event; }
    
    public TimeBalance getTimeBalance() { return timeBalance; }
    public void setTimeBalance(TimeBalance timeBalance) { this.timeBalance = timeBalance; }
    
    public AIInsight getInsight() { return insight; }
    public void setInsight(AIInsight insight) { this.insight = insight; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}