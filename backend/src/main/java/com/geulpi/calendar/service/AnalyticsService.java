package com.geulpi.calendar.service;

import com.geulpi.calendar.domain.enums.AnalyticsPeriod;
import com.geulpi.calendar.dto.TimeBalance;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnalyticsService {
    
    private final TimeBalanceService timeBalanceService;
    
    public TimeBalance getTimeBalance(AnalyticsPeriod period) {
        return timeBalanceService.getTimeBalance(period);
    }
}