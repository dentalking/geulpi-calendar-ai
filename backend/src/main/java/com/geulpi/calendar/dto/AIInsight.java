package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.enums.InsightType;
import com.geulpi.calendar.domain.enums.Priority;

public class AIInsight {
    private String id;
    private InsightType type;
    private String message;
    private Priority priority;
    private boolean actionable;

    public AIInsight() {}

    public AIInsight(String id, InsightType type, String message, Priority priority, boolean actionable) {
        this.id = id;
        this.type = type;
        this.message = message;
        this.priority = priority;
        this.actionable = actionable;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public InsightType getType() { return type; }
    public void setType(InsightType type) { this.type = type; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }
    
    public boolean isActionable() { return actionable; }
    public void setActionable(boolean actionable) { this.actionable = actionable; }
}