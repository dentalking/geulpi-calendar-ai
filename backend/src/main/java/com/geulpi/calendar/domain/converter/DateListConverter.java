package com.geulpi.calendar.domain.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Converter
public class DateListConverter implements AttributeConverter<List<LocalDate>, String> {
    private static final String DELIMITER = ",";
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    
    @Override
    public String convertToDatabaseColumn(List<LocalDate> attribute) {
        if (attribute == null || attribute.isEmpty()) {
            return null;
        }
        return attribute.stream()
                .map(date -> date.format(FORMATTER))
                .collect(Collectors.joining(DELIMITER));
    }
    
    @Override
    public List<LocalDate> convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.trim().isEmpty()) {
            return new ArrayList<>();
        }
        return Arrays.stream(dbData.split(DELIMITER))
                .map(String::trim)
                .map(dateStr -> LocalDate.parse(dateStr, FORMATTER))
                .collect(Collectors.toList());
    }
}