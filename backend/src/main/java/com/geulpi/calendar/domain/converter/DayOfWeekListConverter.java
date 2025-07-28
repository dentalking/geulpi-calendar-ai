package com.geulpi.calendar.domain.converter;

import com.geulpi.calendar.domain.enums.DayOfWeek;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Converter
public class DayOfWeekListConverter implements AttributeConverter<List<DayOfWeek>, String> {
    private static final String DELIMITER = ",";
    
    @Override
    public String convertToDatabaseColumn(List<DayOfWeek> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return null;
        }
        return attribute.stream()
                .map(Enum::name)
                .collect(Collectors.joining(DELIMITER));
    }
    
    @Override
    public List<DayOfWeek> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.stream(dbData.split(DELIMITER))
                .map(String::trim)
                .map(DayOfWeek::valueOf)
                .collect(Collectors.toList());
    }
}