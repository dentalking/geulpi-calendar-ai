package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.enums.Severity;
import java.time.LocalDateTime;

public class BalanceAlert {
    private String id;
    private String title;
    private String message;
    private Severity severity;
    private AreaBalance affectedArea;
    private LocalDateTime timestamp;

    public BalanceAlert() {}

    public BalanceAlert(String id, String title, String message, Severity severity, 
                       AreaBalance affectedArea, LocalDateTime timestamp) {
        this.id = id;
        this.title = title;
        this.message = message;
        this.severity = severity;
        this.affectedArea = affectedArea;
        this.timestamp = timestamp;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public Severity getSeverity() { return severity; }
    public void setSeverity(Severity severity) { this.severity = severity; }
    
    public AreaBalance getAffectedArea() { return affectedArea; }
    public void setAffectedArea(AreaBalance affectedArea) { this.affectedArea = affectedArea; }
    
    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }
}