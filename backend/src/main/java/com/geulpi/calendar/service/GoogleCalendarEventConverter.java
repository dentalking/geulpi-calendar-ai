package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.LifeArea;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.CreatedBy;
import com.geulpi.calendar.domain.enums.EventSource;
import com.geulpi.calendar.repository.LifeAreaRepository;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.EventAttendee;
import com.google.api.services.calendar.model.EventDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleCalendarEventConverter {
    
    private final LifeAreaRepository lifeAreaRepository;
    
    public List<Event> convertGoogleEventsToEvents(List<com.google.api.services.calendar.model.Event> googleEvents, User user) {
        List<LifeArea> userLifeAreas = lifeAreaRepository.findByLifePhilosophyUserId(user.getId());
        
        if (userLifeAreas.isEmpty()) {
            log.warn("No life areas found for user {}. Creating default life area.", user.getId());
            // In a real implementation, you might want to create a default life area
            // or handle this case differently
            return new ArrayList<>();
        }
        
        // Use the first life area as default for imported events
        // In a more sophisticated implementation, you might use AI to categorize events
        LifeArea defaultLifeArea = userLifeAreas.get(0);
        
        return googleEvents.stream()
                .map(googleEvent -> convertSingleEvent(googleEvent, user, defaultLifeArea))
                .filter(event -> event != null)
                .collect(Collectors.toList());
    }
    
    private Event convertSingleEvent(com.google.api.services.calendar.model.Event googleEvent, User user, LifeArea defaultLifeArea) {
        try {
            // Skip events that are cancelled or don't have start/end times
            if ("cancelled".equals(googleEvent.getStatus()) || 
                googleEvent.getStart() == null || 
                googleEvent.getEnd() == null) {
                return null;
            }
            
            Event.EventBuilder eventBuilder = Event.builder()
                    .title(getEventTitle(googleEvent))
                    .description(googleEvent.getDescription())
                    .user(user)
                    .area(defaultLifeArea)
                    .source(EventSource.GOOGLE_CALENDAR)
                    .createdBy(CreatedBy.IMPORT)
                    .googleEventId(googleEvent.getId())
                    .aiConfidence(0.5f) // Default confidence for imported events
                    .balanceImpact(0.0f) // Default balance impact
                    .color(googleEvent.getColorId());
            
            // Handle start and end times
            setEventTimes(eventBuilder, googleEvent);
            
            // Handle attendees
            setEventAttendees(eventBuilder, googleEvent);
            
            // Set timezone
            String timezone = extractTimezone(googleEvent);
            eventBuilder.timezone(timezone != null ? timezone : "Asia/Seoul");
            
            return eventBuilder.build();
            
        } catch (Exception e) {
            log.error("Failed to convert Google event {}: {}", googleEvent.getId(), e.getMessage(), e);
            return null;
        }
    }
    
    private String getEventTitle(com.google.api.services.calendar.model.Event googleEvent) {
        String title = googleEvent.getSummary();
        return title != null && !title.trim().isEmpty() ? title : "No Title";
    }
    
    private void setEventTimes(Event.EventBuilder eventBuilder, com.google.api.services.calendar.model.Event googleEvent) {
        EventDateTime start = googleEvent.getStart();
        EventDateTime end = googleEvent.getEnd();
        
        // Check if it's an all-day event
        boolean isAllDay = start.getDate() != null;
        eventBuilder.allDay(isAllDay);
        
        if (isAllDay) {
            // For all-day events, use the date value
            LocalDateTime startTime = convertDateToLocalDateTime(start.getDate());
            LocalDateTime endTime = convertDateToLocalDateTime(end.getDate());
            
            eventBuilder.startTime(startTime);
            eventBuilder.endTime(endTime);
        } else {
            // For timed events, use the dateTime value
            LocalDateTime startTime = convertDateTimeToLocalDateTime(start.getDateTime());
            LocalDateTime endTime = convertDateTimeToLocalDateTime(end.getDateTime());
            
            eventBuilder.startTime(startTime);
            eventBuilder.endTime(endTime);
        }
    }
    
    private void setEventAttendees(Event.EventBuilder eventBuilder, com.google.api.services.calendar.model.Event googleEvent) {
        List<EventAttendee> attendees = googleEvent.getAttendees();
        if (attendees != null && !attendees.isEmpty()) {
            List<String> attendeeEmails = attendees.stream()
                    .map(EventAttendee::getEmail)
                    .filter(email -> email != null && !email.trim().isEmpty())
                    .collect(Collectors.toList());
            eventBuilder.attendees(attendeeEmails);
        } else {
            eventBuilder.attendees(new ArrayList<>());
        }
    }
    
    private String extractTimezone(com.google.api.services.calendar.model.Event googleEvent) {
        // Try to get timezone from start time
        EventDateTime start = googleEvent.getStart();
        if (start != null && start.getTimeZone() != null) {
            return start.getTimeZone();
        }
        
        // Try to get timezone from end time
        EventDateTime end = googleEvent.getEnd();
        if (end != null && end.getTimeZone() != null) {
            return end.getTimeZone();
        }
        
        return null;
    }
    
    private LocalDateTime convertDateTimeToLocalDateTime(DateTime dateTime) {
        if (dateTime == null) {
            return LocalDateTime.now();
        }
        
        try {
            // DateTime from Google API includes timezone information
            ZonedDateTime zonedDateTime = ZonedDateTime.ofInstant(
                    java.time.Instant.ofEpochMilli(dateTime.getValue()),
                    ZoneId.systemDefault()
            );
            return zonedDateTime.toLocalDateTime();
        } catch (Exception e) {
            log.warn("Failed to convert DateTime {}: {}", dateTime, e.getMessage());
            return LocalDateTime.now();
        }
    }
    
    private LocalDateTime convertDateToLocalDateTime(DateTime date) {
        if (date == null) {
            return LocalDateTime.now().toLocalDate().atStartOfDay();
        }
        
        try {
            // For all-day events, the date represents the start of the day in the event's timezone
            return LocalDateTime.ofInstant(
                    java.time.Instant.ofEpochMilli(date.getValue()),
                    ZoneId.systemDefault()
            );
        } catch (Exception e) {
            log.warn("Failed to convert Date {}: {}", date, e.getMessage());
            return LocalDateTime.now().toLocalDate().atStartOfDay();
        }
    }
    
    /**
     * Categorizes events into life areas based on event content.
     * This is a basic implementation - in a production system, 
     * you might use AI/ML to better categorize events.
     */
    public LifeArea categorizeEvent(com.google.api.services.calendar.model.Event googleEvent, List<LifeArea> userLifeAreas) {
        String title = googleEvent.getSummary();
        String description = googleEvent.getDescription();
        
        if (title == null) title = "";
        if (description == null) description = "";
        
        String content = (title + " " + description).toLowerCase();
        
        // Simple keyword-based categorization
        for (LifeArea lifeArea : userLifeAreas) {
            String areaName = lifeArea.getName().toLowerCase();
            String areaDescription = lifeArea.getDescription() != null ? lifeArea.getDescription().toLowerCase() : "";
            
            if (content.contains(areaName) || 
                (!areaDescription.isEmpty() && content.contains(areaDescription))) {
                return lifeArea;
            }
        }
        
        // Return first life area as default
        return userLifeAreas.get(0);
    }
}