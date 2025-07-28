package com.geulpi.calendar.dto;

import com.geulpi.calendar.domain.entity.LifeArea;

public class AreaBalance {
    private LifeArea area;
    private double actualPercentage;
    private double targetPercentage;
    private double deviation;
    private int totalMinutes;

    public AreaBalance() {}

    public AreaBalance(LifeArea area, double actualPercentage, double targetPercentage, 
                      double deviation, int totalMinutes) {
        this.area = area;
        this.actualPercentage = actualPercentage;
        this.targetPercentage = targetPercentage;
        this.deviation = deviation;
        this.totalMinutes = totalMinutes;
    }

    public LifeArea getArea() { return area; }
    public void setArea(LifeArea area) { this.area = area; }
    
    public double getActualPercentage() { return actualPercentage; }
    public void setActualPercentage(double actualPercentage) { this.actualPercentage = actualPercentage; }
    
    public double getTargetPercentage() { return targetPercentage; }
    public void setTargetPercentage(double targetPercentage) { this.targetPercentage = targetPercentage; }
    
    public double getDeviation() { return deviation; }
    public void setDeviation(double deviation) { this.deviation = deviation; }
    
    public int getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(int totalMinutes) { this.totalMinutes = totalMinutes; }
}