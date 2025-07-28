package com.geulpi.calendar;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
@EntityScan(basePackages = "com.geulpi.calendar.domain.entity")
@EnableJpaRepositories(basePackages = "com.geulpi.calendar.repository")
public class GeulpiCalendarApplication {
    public static void main(String[] args) {
        SpringApplication.run(GeulpiCalendarApplication.class, args);
    }
}