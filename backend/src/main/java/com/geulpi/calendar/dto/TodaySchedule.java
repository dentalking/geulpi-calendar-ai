package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.TimeSlot;
import java.time.LocalDateTime;
import java.util.List;

public class TodaySchedule {
    private LocalDateTime date;
    private List<Event> events;
    private int totalEvents;
    private double busyHours;
    private List<TimeSlot> freeTimeSlots;
    private String dailyGoal;

    public TodaySchedule() {}

    public TodaySchedule(LocalDateTime date, List<Event> events, int totalEvents, 
                        double busyHours, List<TimeSlot> freeTimeSlots, String dailyGoal) {
        this.date = date;
        this.events = events;
        this.totalEvents = totalEvents;
        this.busyHours = busyHours;
        this.freeTimeSlots = freeTimeSlots;
        this.dailyGoal = dailyGoal;
    }

    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }
    
    public List<Event> getEvents() { return events; }
    public void setEvents(List<Event> events) { this.events = events; }
    
    public int getTotalEvents() { return totalEvents; }
    public void setTotalEvents(int totalEvents) { this.totalEvents = totalEvents; }
    
    public double getBusyHours() { return busyHours; }
    public void setBusyHours(double busyHours) { this.busyHours = busyHours; }
    
    public List<TimeSlot> getFreeTimeSlots() { return freeTimeSlots; }
    public void setFreeTimeSlots(List<TimeSlot> freeTimeSlots) { this.freeTimeSlots = freeTimeSlots; }
    
    public String getDailyGoal() { return dailyGoal; }
    public void setDailyGoal(String dailyGoal) { this.dailyGoal = dailyGoal; }
}