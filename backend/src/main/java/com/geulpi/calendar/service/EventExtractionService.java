package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.LifeArea;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.CreatedBy;
import com.geulpi.calendar.domain.enums.EventSource;
import com.geulpi.calendar.dto.AIResponse;
import com.geulpi.calendar.dto.ExtractedEventInfo;
import com.geulpi.calendar.external.OpenAIClient;
import com.geulpi.calendar.repository.LifeAreaRepository;
import com.geulpi.calendar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventExtractionService {
    
    private final UserRepository userRepository;
    private final LifeAreaRepository lifeAreaRepository;
    private final OpenAIClient openAIClient;
    private final EventService eventService;
    
    // Common date and time patterns
    private static final Pattern DATE_PATTERNS = Pattern.compile(
        "(?i)(\\d{1,2})[/\\-](\\d{1,2})[/\\-](\\d{2,4})|" +  // MM/DD/YYYY or DD/MM/YYYY
        "(?i)(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\s+(\\d{1,2}),?\\s+(\\d{2,4})|" + // Month DD, YYYY
        "(?i)(\\d{1,2})\\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\s+(\\d{2,4})|" + // DD Month YYYY
        "(?i)(today|tomorrow|next\\s+\\w+day)|" + // Relative dates
        "(?i)(\\d{4})[/\\-](\\d{1,2})[/\\-](\\d{1,2})" // YYYY/MM/DD
    );
    
    private static final Pattern TIME_PATTERNS = Pattern.compile(
        "(?i)(\\d{1,2}):(\\d{2})\\s*(am|pm)?|" + // HH:MM AM/PM
        "(?i)(\\d{1,2})\\s*(am|pm)|" + // H AM/PM
        "(?i)at\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?|" + // at H:MM AM/PM
        "(?i)(morning|afternoon|evening|night)|" + // General time
        "(?i)(noon|midnight)" // Specific times
    );
    
    public AIResponse processExtractedText(String extractedText, EventSource source) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String userId = authentication.getName();
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        log.info("Processing extracted text from {}: {}", source, extractedText.substring(0, Math.min(100, extractedText.length())));
        
        try {
            // First, use OpenAI to analyze the text and extract structured event information
            String aiPrompt = buildEventExtractionPrompt(extractedText, source);
            String aiResponse = openAIClient.generateResponse(aiPrompt);
            
            // Parse AI response and extract event information
            List<ExtractedEventInfo> extractedEvents = parseAIEventResponse(aiResponse);
            
            // If AI didn't find clear events, fall back to regex-based extraction
            if (extractedEvents.isEmpty()) {
                extractedEvents = extractEventsWithRegex(extractedText);
            }
            
            // Convert extracted information to Events
            List<Event> events = new ArrayList<>();
            for (ExtractedEventInfo eventInfo : extractedEvents) {
                try {
                    Event event = createEventFromExtractedInfo(eventInfo, user, source);
                    if (event != null) {
                        events.add(event);
                    }
                } catch (Exception e) {
                    log.warn("Failed to create event from extracted info: {}", eventInfo, e);
                }
            }
            
            return AIResponse.builder()
                    .understood(!events.isEmpty())
                    .intent(com.geulpi.calendar.domain.enums.Intent.CREATE_EVENT)
                    .events(events)
                    .suggestions(new ArrayList<>())
                    .message(buildResponseMessage(events, extractedText, source))
                    .clarificationNeeded(events.isEmpty())
                    .clarificationPrompts(events.isEmpty() ? 
                        List.of("Could you provide more specific date and time information?",
                               "What would you like to title this event?") : 
                        new ArrayList<>())
                    .build();
                    
        } catch (Exception e) {
            log.error("Error processing extracted text", e);
            return AIResponse.builder()
                    .understood(false)
                    .intent(com.geulpi.calendar.domain.enums.Intent.UNKNOWN)
                    .events(new ArrayList<>())
                    .suggestions(new ArrayList<>())
                    .message("I had trouble understanding the " + source.toString().toLowerCase() + ". Could you try again or provide the information in text form?")
                    .clarificationNeeded(true)
                    .clarificationPrompts(List.of("Could you provide the event details in text form?"))
                    .build();
        }
    }
    
    private String buildEventExtractionPrompt(String text, EventSource source) {
        return String.format("""
            Please analyze the following text extracted from %s and identify any calendar events or appointments.
            
            Text: "%s"
            
            For each event you identify, provide the following information in a structured format:
            - Title: [event title]
            - Date: [date in YYYY-MM-DD format if identifiable]
            - Start Time: [time in HH:MM format if identifiable]
            - End Time: [time in HH:MM format if identifiable]
            - Location: [location if mentioned]
            - Description: [any additional details]
            - Participants: [list of people mentioned]
            
            If the date/time is relative (like "tomorrow", "next Monday"), convert it to actual dates based on today being %s.
            If information is unclear or missing, indicate that explicitly.
            
            Respond with "NO EVENTS FOUND" if no clear calendar events can be identified.
            """, 
            source.toString().toLowerCase(),
            text,
            LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        );
    }
    
    private List<ExtractedEventInfo> parseAIEventResponse(String aiResponse) {
        List<ExtractedEventInfo> events = new ArrayList<>();
        
        if (aiResponse.contains("NO EVENTS FOUND")) {
            return events;
        }
        
        // Parse the structured response from AI
        String[] lines = aiResponse.split("\n");
        ExtractedEventInfo currentEvent = null;
        
        for (String line : lines) {
            line = line.trim();
            if (line.isEmpty()) continue;
            
            if (line.toLowerCase().startsWith("title:")) {
                if (currentEvent != null) {
                    events.add(currentEvent);
                }
                currentEvent = new ExtractedEventInfo();
                currentEvent.setTitle(line.substring(6).trim());
            } else if (currentEvent != null) {
                if (line.toLowerCase().startsWith("date:")) {
                    currentEvent.setDateString(line.substring(5).trim());
                } else if (line.toLowerCase().startsWith("start time:")) {
                    currentEvent.setStartTimeString(line.substring(11).trim());
                } else if (line.toLowerCase().startsWith("end time:")) {
                    currentEvent.setEndTimeString(line.substring(9).trim());
                } else if (line.toLowerCase().startsWith("location:")) {
                    currentEvent.setLocation(line.substring(9).trim());
                } else if (line.toLowerCase().startsWith("description:")) {
                    currentEvent.setDescription(line.substring(12).trim());
                } else if (line.toLowerCase().startsWith("participants:")) {
                    String participants = line.substring(13).trim();
                    if (!participants.isEmpty() && !participants.equalsIgnoreCase("none")) {
                        currentEvent.setParticipants(Arrays.asList(participants.split(",\\s*")));
                    }
                }
            }
        }
        
        if (currentEvent != null) {
            events.add(currentEvent);
        }
        
        return events;
    }
    
    private List<ExtractedEventInfo> extractEventsWithRegex(String text) {
        List<ExtractedEventInfo> events = new ArrayList<>();
        
        // Look for common meeting patterns
        Pattern meetingPattern = Pattern.compile(
            "(?i)(meeting|appointment|call|conference|lunch|dinner|workshop|training|interview).*?" +
            "(?:on|at)?\\s*([\\w\\s,]+?)(?:from|at)?\\s*(\\d{1,2}(?::\\d{2})?\\s*(?:am|pm)?)",
            Pattern.DOTALL
        );
        
        Matcher matcher = meetingPattern.matcher(text);
        while (matcher.find()) {
            ExtractedEventInfo event = new ExtractedEventInfo();
            event.setTitle(matcher.group(1) + " - " + matcher.group(2).trim());
            event.setStartTimeString(matcher.group(3));
            
            // Try to extract date from surrounding context
            String context = text.substring(Math.max(0, matcher.start() - 50), 
                                         Math.min(text.length(), matcher.end() + 50));
            Matcher dateMatcher = DATE_PATTERNS.matcher(context);
            if (dateMatcher.find()) {
                event.setDateString(dateMatcher.group());
            }
            
            events.add(event);
        }
        
        return events;
    }
    
    private Event createEventFromExtractedInfo(ExtractedEventInfo eventInfo, User user, EventSource source) {
        if (eventInfo.getTitle() == null || eventInfo.getTitle().trim().isEmpty()) {
            return null;
        }
        
        // Parse date and time
        LocalDateTime startTime = parseDateTime(eventInfo.getDateString(), eventInfo.getStartTimeString());
        LocalDateTime endTime = parseDateTime(eventInfo.getDateString(), eventInfo.getEndTimeString());
        
        // If no valid start time, skip this event
        if (startTime == null) {
            log.warn("Could not parse start time for event: {}", eventInfo.getTitle());
            return null;
        }
        
        // If no end time, assume 1 hour duration
        if (endTime == null) {
            endTime = startTime.plusHours(1);
        }
        
        // Determine life area based on event content
        LifeArea lifeArea = classifyEventToLifeArea(eventInfo, user);
        
        return Event.builder()
                .user(user)
                .title(eventInfo.getTitle())
                .description(eventInfo.getDescription())
                .startTime(startTime)
                .endTime(endTime)
                .allDay(false)
                .timezone("UTC") // You might want to use user's timezone
                .area(lifeArea)
                .source(source)
                .createdBy(CreatedBy.AI)
                .aiConfidence(0.7f) // Moderate confidence for extracted events
                .attendees(eventInfo.getParticipants() != null ? eventInfo.getParticipants() : new ArrayList<>())
                .tags(new ArrayList<>())
                .build();
    }
    
    private LocalDateTime parseDateTime(String dateString, String timeString) {
        if (dateString == null && timeString == null) {
            return null;
        }
        
        try {
            LocalDateTime baseDate = LocalDateTime.now();
            
            // Parse date
            if (dateString != null && !dateString.trim().isEmpty()) {
                baseDate = parseDateString(dateString);
            }
            
            // Parse time
            if (timeString != null && !timeString.trim().isEmpty()) {
                LocalDateTime timeComponent = parseTimeString(timeString);
                if (timeComponent != null) {
                    return baseDate.toLocalDate().atTime(timeComponent.toLocalTime());
                }
            }
            
            return baseDate;
            
        } catch (Exception e) {
            log.warn("Failed to parse date/time: date='{}', time='{}'", dateString, timeString, e);
            return null;
        }
    }
    
    private LocalDateTime parseDateString(String dateString) {
        // Try various date formats
        String[] formats = {
            "yyyy-MM-dd",
            "MM/dd/yyyy",
            "dd/MM/yyyy",
            "MMMM dd, yyyy",
            "MMM dd, yyyy",
            "dd MMMM yyyy"
        };
        
        for (String format : formats) {
            try {
                return LocalDateTime.parse(dateString + " 09:00", 
                    DateTimeFormatter.ofPattern(format + " HH:mm"));
            } catch (DateTimeParseException e) {
                // Try next format
            }
        }
        
        // Handle relative dates
        if (dateString.toLowerCase().contains("today")) {
            return LocalDateTime.now();
        } else if (dateString.toLowerCase().contains("tomorrow")) {
            return LocalDateTime.now().plusDays(1);
        }
        
        return LocalDateTime.now(); // Default to today
    }
    
    private LocalDateTime parseTimeString(String timeString) {
        try {
            // Clean up the time string
            timeString = timeString.trim().toLowerCase();
            
            // Handle special cases
            if (timeString.contains("noon")) {
                return LocalDateTime.now().withHour(12).withMinute(0);
            } else if (timeString.contains("midnight")) {
                return LocalDateTime.now().withHour(0).withMinute(0);
            }
            
            // Parse HH:MM format
            Pattern timePattern = Pattern.compile("(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm)?");
            Matcher matcher = timePattern.matcher(timeString);
            
            if (matcher.find()) {
                int hour = Integer.parseInt(matcher.group(1));
                int minute = matcher.group(2) != null ? Integer.parseInt(matcher.group(2)) : 0;
                String ampm = matcher.group(3);
                
                if (ampm != null) {
                    if (ampm.equals("pm") && hour != 12) {
                        hour += 12;
                    } else if (ampm.equals("am") && hour == 12) {
                        hour = 0;
                    }
                }
                
                return LocalDateTime.now().withHour(hour).withMinute(minute);
            }
            
        } catch (Exception e) {
            log.warn("Failed to parse time string: {}", timeString, e);
        }
        
        return null;
    }
    
    private LifeArea classifyEventToLifeArea(ExtractedEventInfo eventInfo, User user) {
        // Try to match event content to user's life areas
        String content = (eventInfo.getTitle() + " " + 
                         (eventInfo.getDescription() != null ? eventInfo.getDescription() : "")).toLowerCase();
        
        if (user.getLifePhilosophy() != null && !user.getLifePhilosophy().getAreas().isEmpty()) {
            for (LifeArea area : user.getLifePhilosophy().getAreas()) {
                String areaName = area.getName().toLowerCase();
                if (content.contains(areaName) || 
                    (areaName.equals("work") && (content.contains("meeting") || content.contains("call") || content.contains("conference"))) ||
                    (areaName.equals("health") && (content.contains("gym") || content.contains("doctor") || content.contains("workout"))) ||
                    (areaName.equals("personal") && (content.contains("lunch") || content.contains("dinner") || content.contains("family")))) {
                    return area;
                }
            }
            
            // Return first area as default
            return user.getLifePhilosophy().getAreas().get(0);
        }
        
        // If no life areas defined, try to find a generic one
        return lifeAreaRepository.findByLifePhilosophyUserIdAndName(user.getId(), "General")
                .orElse(null);
    }
    
    private String buildResponseMessage(List<Event> events, String originalText, EventSource source) {
        if (events.isEmpty()) {
            return String.format("I couldn't identify any clear events from the %s. The text might need to be clearer or contain more specific date/time information.", 
                                source.toString().toLowerCase());
        }
        
        if (events.size() == 1) {
            return String.format("I found 1 event from the %s: \"%s\" scheduled for %s", 
                                source.toString().toLowerCase(),
                                events.get(0).getTitle(),
                                events.get(0).getStartTime().format(DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' h:mm a")));
        }
        
        return String.format("I found %d events from the %s. Please review and confirm if they look correct.", 
                           events.size(), source.toString().toLowerCase());
    }
}