package com.geulpi.calendar.monitoring;

import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Scheduled;
import lombok.extern.slf4j.Slf4j;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * API 사용량 모니터링 서비스
 * OpenAI, Google API 등의 사용량을 추적하고 일일 한도를 관리
 */
@Service
@Slf4j
public class APIUsageMonitor {
    
    private static final long DAILY_LIMIT_WON = 1000; // 일일 1000원 한도
    
    // API별 가격 (원화 기준)
    private static final double OPENAI_GPT35_INPUT_PRICE = 1.5; // 1K 토큰당
    private static final double OPENAI_GPT35_OUTPUT_PRICE = 2.0;
    private static final double OPENAI_GPT4_INPUT_PRICE = 30.0;
    private static final double OPENAI_GPT4_OUTPUT_PRICE = 60.0;
    private static final double GOOGLE_VISION_PRICE = 1.5; // 이미지당
    private static final double GOOGLE_TRANSLATE_PRICE = 20.0; // 100만 문자당
    
    private final ConcurrentHashMap<String, AtomicLong> dailyUsage = new ConcurrentHashMap<>();
    private LocalDate currentDate = LocalDate.now();
    
    /**
     * OpenAI API 사용량 기록
     */
    public void trackOpenAIUsage(String model, int inputTokens, int outputTokens) {
        double cost = 0;
        
        if (model.contains("gpt-3.5")) {
            cost = (inputTokens / 1000.0 * OPENAI_GPT35_INPUT_PRICE) + 
                   (outputTokens / 1000.0 * OPENAI_GPT35_OUTPUT_PRICE);
        } else if (model.contains("gpt-4")) {
            cost = (inputTokens / 1000.0 * OPENAI_GPT4_INPUT_PRICE) + 
                   (outputTokens / 1000.0 * OPENAI_GPT4_OUTPUT_PRICE);
        }
        
        addUsage("openai", (long) cost);
        checkLimit();
        
        log.info("OpenAI API 사용: 모델={}, 입력토큰={}, 출력토큰={}, 비용={}원", 
                 model, inputTokens, outputTokens, cost);
    }
    
    /**
     * Google Vision API 사용량 기록
     */
    public void trackGoogleVisionUsage(int imageCount) {
        double cost = imageCount * GOOGLE_VISION_PRICE;
        addUsage("google_vision", (long) cost);
        checkLimit();
        
        log.info("Google Vision API 사용: 이미지수={}, 비용={}원", imageCount, cost);
    }
    
    /**
     * 일일 사용량 추가
     */
    private void addUsage(String service, long costWon) {
        resetIfNewDay();
        
        dailyUsage.computeIfAbsent(service, k -> new AtomicLong(0))
                  .addAndGet(costWon);
        dailyUsage.computeIfAbsent("total", k -> new AtomicLong(0))
                  .addAndGet(costWon);
    }
    
    /**
     * 한도 체크
     */
    private void checkLimit() {
        long totalUsage = getTotalDailyUsage();
        
        if (totalUsage > DAILY_LIMIT_WON) {
            log.error("⚠️ 일일 API 사용 한도 초과! 현재: {}원, 한도: {}원", 
                      totalUsage, DAILY_LIMIT_WON);
            throw new APIUsageLimitExceededException("일일 API 사용 한도를 초과했습니다");
        }
        
        if (totalUsage > DAILY_LIMIT_WON * 0.8) {
            log.warn("⚠️ 일일 API 사용량 경고: {}% 사용 중", 
                     (totalUsage * 100 / DAILY_LIMIT_WON));
        }
    }
    
    /**
     * 일일 총 사용량 조회
     */
    public long getTotalDailyUsage() {
        resetIfNewDay();
        return dailyUsage.getOrDefault("total", new AtomicLong(0)).get();
    }
    
    /**
     * 서비스별 사용량 조회
     */
    public ConcurrentHashMap<String, Long> getUsageBreakdown() {
        resetIfNewDay();
        ConcurrentHashMap<String, Long> breakdown = new ConcurrentHashMap<>();
        
        dailyUsage.forEach((service, usage) -> {
            breakdown.put(service, usage.get());
        });
        
        return breakdown;
    }
    
    /**
     * 사용량 통계
     */
    public APIUsageStats getStats() {
        long total = getTotalDailyUsage();
        long remaining = DAILY_LIMIT_WON - total;
        double percentage = (double) total / DAILY_LIMIT_WON * 100;
        
        return APIUsageStats.builder()
                .date(currentDate)
                .totalUsage(total)
                .dailyLimit(DAILY_LIMIT_WON)
                .remainingBudget(remaining)
                .usagePercentage(percentage)
                .breakdown(getUsageBreakdown())
                .build();
    }
    
    /**
     * 날짜가 바뀌면 사용량 초기화
     */
    private void resetIfNewDay() {
        LocalDate today = LocalDate.now();
        if (!today.equals(currentDate)) {
            log.info("새로운 날짜 - API 사용량 초기화: {} -> {}", currentDate, today);
            dailyUsage.clear();
            currentDate = today;
        }
    }
    
    /**
     * 매일 자정에 사용량 리포트 생성
     */
    @Scheduled(cron = "0 0 0 * * *")
    public void generateDailyReport() {
        APIUsageStats stats = getStats();
        
        log.info("""
            📊 일일 API 사용량 리포트
            ================================
            날짜: {}
            총 사용액: {}원
            일일 한도: {}원
            사용률: {:.1f}%
            잔여 예산: {}원
            
            서비스별 사용량:
            {}
            ================================
            """, 
            stats.getDate(),
            stats.getTotalUsage(),
            stats.getDailyLimit(),
            stats.getUsagePercentage(),
            stats.getRemainingBudget(),
            formatBreakdown(stats.getBreakdown())
        );
    }
    
    private String formatBreakdown(ConcurrentHashMap<String, Long> breakdown) {
        StringBuilder sb = new StringBuilder();
        breakdown.forEach((service, usage) -> {
            if (!"total".equals(service)) {
                sb.append(String.format("- %s: %d원\n", service, usage));
            }
        });
        return sb.toString();
    }
    
    /**
     * 사용량 통계 DTO
     */
    @lombok.Data
    @lombok.Builder
    public static class APIUsageStats {
        private LocalDate date;
        private long totalUsage;
        private long dailyLimit;
        private long remainingBudget;
        private double usagePercentage;
        private ConcurrentHashMap<String, Long> breakdown;
    }
    
    /**
     * API 사용 한도 초과 예외
     */
    public static class APIUsageLimitExceededException extends RuntimeException {
        public APIUsageLimitExceededException(String message) {
            super(message);
        }
    }
}