package com.geulpi.calendar.dto;

public class TranscriptionResult {
    private String text;
    private double confidence;
    private String language;

    public TranscriptionResult() {}

    public TranscriptionResult(String text, double confidence, String language) {
        this.text = text;
        this.confidence = confidence;
        this.language = language;
    }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    
    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
    
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}