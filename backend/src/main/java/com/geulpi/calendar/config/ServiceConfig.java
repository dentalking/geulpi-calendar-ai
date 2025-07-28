package com.geulpi.calendar.config;

import com.geulpi.calendar.service.DashboardService;
import com.geulpi.calendar.service.ScheduleOptimizer;
import org.springframework.context.annotation.Configuration;

import javax.annotation.PostConstruct;

@Configuration
public class ServiceConfig {
    
    private final DashboardService dashboardService;
    private final ScheduleOptimizer scheduleOptimizer;
    
    public ServiceConfig(DashboardService dashboardService, ScheduleOptimizer scheduleOptimizer) {
        this.dashboardService = dashboardService;
        this.scheduleOptimizer = scheduleOptimizer;
    }
    
    @PostConstruct
    public void configureServices() {
        dashboardService.setScheduleOptimizer(scheduleOptimizer);
    }
}