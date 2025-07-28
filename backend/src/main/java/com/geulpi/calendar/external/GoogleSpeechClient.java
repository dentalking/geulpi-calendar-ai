package com.geulpi.calendar.external;

import com.google.cloud.speech.v1.*;
import com.google.protobuf.ByteString;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleSpeechClient {
    
    public String transcribeAudio(String base64Audio) {
        try (SpeechClient speechClient = SpeechClient.create()) {
            // Remove base64 prefix if present
            String audioData = base64Audio;
            if (base64Audio.contains(",")) {
                audioData = base64Audio.split(",")[1];
            }
            
            // Decode base64 audio
            byte[] audioBytes = Base64.getDecoder().decode(audioData);
            ByteString audioByteString = ByteString.copyFrom(audioBytes);
            
            // Configure recognition config
            RecognitionConfig config = RecognitionConfig.newBuilder()
                    .setEncoding(RecognitionConfig.AudioEncoding.WEBM_OPUS) // Common web format
                    .setSampleRateHertz(16000)
                    .setLanguageCode("en-US") // You might want to make this configurable
                    .addAlternativeLanguageCodes("ko-KR") // Support Korean as well
                    .setModel("latest_long") // Use latest model for better accuracy
                    .setUseEnhanced(true)
                    .build();
            
            // Create recognition audio
            RecognitionAudio audio = RecognitionAudio.newBuilder()
                    .setContent(audioByteString)
                    .build();
            
            // Perform the recognition
            RecognizeResponse response = speechClient.recognize(config, audio);
            List<SpeechRecognitionResult> results = response.getResultsList();
            
            StringBuilder transcript = new StringBuilder();
            
            for (SpeechRecognitionResult result : results) {
                if (!result.getAlternativesList().isEmpty()) {
                    SpeechRecognitionAlternative alternative = result.getAlternatives(0);
                    transcript.append(alternative.getTranscript()).append(" ");
                }
            }
            
            String result = transcript.toString().trim();
            log.info("Transcribed audio: {} characters", result.length());
            
            return result;
            
        } catch (IOException e) {
            log.error("Failed to create Speech client", e);
            throw new RuntimeException("Failed to transcribe audio", e);
        } catch (Exception e) {
            log.error("Error transcribing audio", e);
            throw new RuntimeException("Failed to transcribe audio", e);
        }
    }
    
    public String transcribeAudioWithMultipleFormats(String base64Audio) {
        // Try different audio formats if the first one fails
        RecognitionConfig.AudioEncoding[] formats = {
            RecognitionConfig.AudioEncoding.WEBM_OPUS,
            RecognitionConfig.AudioEncoding.OGG_OPUS,
            RecognitionConfig.AudioEncoding.FLAC,
            RecognitionConfig.AudioEncoding.LINEAR16,
            RecognitionConfig.AudioEncoding.FLAC
        };
        
        for (RecognitionConfig.AudioEncoding format : formats) {
            try {
                return transcribeAudioWithFormat(base64Audio, format);
            } catch (Exception e) {
                log.warn("Failed to transcribe with format {}: {}", format, e.getMessage());
            }
        }
        
        throw new RuntimeException("Failed to transcribe audio with any supported format");
    }
    
    private String transcribeAudioWithFormat(String base64Audio, RecognitionConfig.AudioEncoding encoding) {
        try (SpeechClient speechClient = SpeechClient.create()) {
            String audioData = base64Audio;
            if (base64Audio.contains(",")) {
                audioData = base64Audio.split(",")[1];
            }
            
            byte[] audioBytes = Base64.getDecoder().decode(audioData);
            ByteString audioByteString = ByteString.copyFrom(audioBytes);
            
            RecognitionConfig config = RecognitionConfig.newBuilder()
                    .setEncoding(encoding)
                    .setSampleRateHertz(16000)
                    .setLanguageCode("en-US")
                    .addAlternativeLanguageCodes("ko-KR")
                    .setModel("latest_long")
                    .setUseEnhanced(true)
                    .setProfanityFilter(false)
                    .setEnableAutomaticPunctuation(true)
                    .setEnableWordTimeOffsets(false)
                    .build();
            
            RecognitionAudio audio = RecognitionAudio.newBuilder()
                    .setContent(audioByteString)
                    .build();
            
            RecognizeResponse response = speechClient.recognize(config, audio);
            List<SpeechRecognitionResult> results = response.getResultsList();
            
            return results.stream()
                    .flatMap(result -> result.getAlternativesList().stream())
                    .findFirst()
                    .map(SpeechRecognitionAlternative::getTranscript)
                    .orElse("");
            
        } catch (Exception e) {
            log.error("Error transcribing audio with format {}", encoding, e);
            throw new RuntimeException("Failed to transcribe audio with format " + encoding, e);
        }
    }
    
    public List<String> transcribeAudioWithTimestamps(String base64Audio) {
        try (SpeechClient speechClient = SpeechClient.create()) {
            String audioData = base64Audio;
            if (base64Audio.contains(",")) {
                audioData = base64Audio.split(",")[1];
            }
            
            byte[] audioBytes = Base64.getDecoder().decode(audioData);
            ByteString audioByteString = ByteString.copyFrom(audioBytes);
            
            RecognitionConfig config = RecognitionConfig.newBuilder()
                    .setEncoding(RecognitionConfig.AudioEncoding.WEBM_OPUS)
                    .setSampleRateHertz(16000)
                    .setLanguageCode("en-US")
                    .addAlternativeLanguageCodes("ko-KR")
                    .setModel("latest_long")
                    .setUseEnhanced(true)
                    .setEnableWordTimeOffsets(true)
                    .setEnableAutomaticPunctuation(true)
                    .build();
            
            RecognitionAudio audio = RecognitionAudio.newBuilder()
                    .setContent(audioByteString)
                    .build();
            
            RecognizeResponse response = speechClient.recognize(config, audio);
            
            return response.getResultsList().stream()
                    .flatMap(result -> result.getAlternativesList().stream())
                    .map(SpeechRecognitionAlternative::getTranscript)
                    .collect(Collectors.toList());
                    
        } catch (Exception e) {
            log.error("Error transcribing audio with timestamps", e);
            throw new RuntimeException("Failed to transcribe audio with timestamps", e);
        }
    }
}