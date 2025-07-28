package com.geulpi.calendar.dto;

import java.util.List;

public class LifeBalanceAnalytics {
    private List<AreaBalance> areas;
    private List<String> recommendations;
    private double score;

    public LifeBalanceAnalytics() {}

    public LifeBalanceAnalytics(List<AreaBalance> areas, List<String> recommendations, double score) {
        this.areas = areas;
        this.recommendations = recommendations;
        this.score = score;
    }

    public List<AreaBalance> getAreas() { return areas; }
    public void setAreas(List<AreaBalance> areas) { this.areas = areas; }
    
    public List<String> getRecommendations() { return recommendations; }
    public void setRecommendations(List<String> recommendations) { this.recommendations = recommendations; }
    
    public double getScore() { return score; }
    public void setScore(double score) { this.score = score; }
}