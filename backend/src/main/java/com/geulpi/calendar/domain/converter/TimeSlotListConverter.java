package com.geulpi.calendar.domain.converter;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.geulpi.calendar.domain.entity.TimeSlot;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.List;

@Converter
public class TimeSlotListConverter implements AttributeConverter<List<TimeSlot>, String> {
    private final ObjectMapper objectMapper;
    
    public TimeSlotListConverter() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }
    
    @Override
    public String convertToDatabaseColumn(List<TimeSlot> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attribute);
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert TimeSlot list to JSON", e);
        }
    }
    
    @Override
    public List<TimeSlot> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return new ArrayList<>();
        }
        try {
            return objectMapper.readValue(dbData, new TypeReference<List<TimeSlot>>() {});
        } catch (Exception e) {
            throw new RuntimeException("Failed to convert JSON to TimeSlot list", e);
        }
    }
}