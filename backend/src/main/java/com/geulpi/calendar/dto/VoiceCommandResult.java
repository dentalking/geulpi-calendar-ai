package com.geulpi.calendar.dto;

public class VoiceCommandResult {
    private String transcription;
    private double confidence;
    private AIResponse nlpResult;

    public VoiceCommandResult() {}

    public VoiceCommandResult(String transcription, double confidence, AIResponse nlpResult) {
        this.transcription = transcription;
        this.confidence = confidence;
        this.nlpResult = nlpResult;
    }

    public String getTranscription() { return transcription; }
    public void setTranscription(String transcription) { this.transcription = transcription; }
    
    public double getConfidence() { return confidence; }
    public void setConfidence(double confidence) { this.confidence = confidence; }
    
    public AIResponse getNlpResult() { return nlpResult; }
    public void setNlpResult(AIResponse nlpResult) { this.nlpResult = nlpResult; }
}