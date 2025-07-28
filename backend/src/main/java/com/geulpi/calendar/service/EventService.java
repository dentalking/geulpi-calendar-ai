package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.entity.Event;
import com.geulpi.calendar.domain.entity.User;
import com.geulpi.calendar.domain.enums.CreatedBy;
import com.geulpi.calendar.domain.enums.EventSource;
import com.geulpi.calendar.dto.CreateEventInput;
import com.geulpi.calendar.dto.EventFilter;
import com.geulpi.calendar.dto.UpdateEventInput;
import com.geulpi.calendar.repository.EventRepository;
import com.geulpi.calendar.repository.LifeAreaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EventService {
    
    private final EventRepository eventRepository;
    private final LifeAreaRepository lifeAreaRepository;
    private final UserService userService;
    
    public List<Event> getEvents(EventFilter filter) {
        User user = userService.getCurrentUser();
        LocalDateTime start = filter.getStartDate().atStartOfDay();
        LocalDateTime end = filter.getEndDate().plusDays(1).atStartOfDay();
        
        if (filter.getAreas() != null && !filter.getAreas().isEmpty()) {
            var areas = lifeAreaRepository.findAllById(filter.getAreas());
            return eventRepository.findByUserIdAndAreaInAndStartTimeBetween(
                user.getId(), areas, start, end);
        }
        
        return eventRepository.findByUserIdAndStartTimeBetweenOrderByStartTime(
            user.getId(), start, end);
    }
    
    public Event getEventById(String id) {
        return eventRepository.findByIdWithDetails(id).orElse(null);
    }
    
    public List<Event> getUpcomingEvents(int limit) {
        User user = userService.getCurrentUser();
        return eventRepository.findTop5ByUserIdAndStartTimeAfterOrderByStartTime(
            user.getId(), LocalDateTime.now());
    }
    
    @Transactional
    public Event createEvent(CreateEventInput input) {
        User user = userService.getCurrentUser();
        
        Event event = Event.builder()
                .title(input.getTitle())
                .description(input.getDescription())
                .startTime(input.getStartTime())
                .endTime(input.getEndTime())
                .allDay(input.getAllDay())
                .timezone(input.getTimezone() != null ? input.getTimezone() : "Asia/Seoul")
                .source(EventSource.USER)
                .createdBy(CreatedBy.USER)
                .aiConfidence(1.0f)
                .balanceImpact(0.0f) // TODO: Calculate actual impact
                .user(user)
                .build();
        
        if (input.getAreaId() != null) {
            event.setArea(lifeAreaRepository.findById(input.getAreaId()).orElse(null));
        }
        
        if (input.getAttendees() != null) {
            event.setAttendees(input.getAttendees());
        }
        
        if (input.getTags() != null) {
            event.setTags(input.getTags());
        }
        
        // TODO: Handle location and recurrence
        
        return eventRepository.save(event);
    }
    
    @Transactional
    public Event updateEvent(String id, UpdateEventInput input) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        
        if (input.getTitle() != null) {
            event.setTitle(input.getTitle());
        }
        if (input.getDescription() != null) {
            event.setDescription(input.getDescription());
        }
        if (input.getStartTime() != null) {
            event.setStartTime(input.getStartTime());
        }
        if (input.getEndTime() != null) {
            event.setEndTime(input.getEndTime());
        }
        if (input.getAreaId() != null) {
            event.setArea(lifeAreaRepository.findById(input.getAreaId()).orElse(null));
        }
        if (input.getAttendees() != null) {
            event.setAttendees(input.getAttendees());
        }
        if (input.getTags() != null) {
            event.setTags(input.getTags());
        }
        
        // TODO: Handle location update
        
        return eventRepository.save(event);
    }
    
    @Transactional
    public Boolean deleteEvent(String id) {
        eventRepository.deleteById(id);
        return true;
    }
    
    @Transactional
    public List<Event> batchCreateEvents(List<CreateEventInput> inputs) {
        return inputs.stream()
                .map(this::createEvent)
                .collect(Collectors.toList());
    }
    
    public List<Event> searchEvents(String query) {
        User user = userService.getCurrentUser();
        return eventRepository.searchByTitleOrDescription(user.getId(), query);
    }
}