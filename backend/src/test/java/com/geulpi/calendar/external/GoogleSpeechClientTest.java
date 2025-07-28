package com.geulpi.calendar.external;

import com.google.cloud.speech.v1.*;
import com.google.protobuf.ByteString;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GoogleSpeechClientTest {

    private GoogleSpeechClient googleSpeechClient;
    private SpeechClient mockSpeechClient;
    private String validBase64Audio;
    private String base64AudioWithPrefix;
    
    @BeforeEach
    void setUp() {
        googleSpeechClient = new GoogleSpeechClient();
        mockSpeechClient = mock(SpeechClient.class);
        
        // Create valid base64 encoded audio data for testing
        byte[] audioBytes = "fake audio data".getBytes();
        validBase64Audio = Base64.getEncoder().encodeToString(audioBytes);
        base64AudioWithPrefix = "data:audio/webm;base64," + validBase64Audio;
    }

    @Test
    void transcribeAudio_WithValidAudio_ReturnsTranscription() throws IOException {
        // Arrange
        String expectedTranscript = "Hello, this is a test transcription.";
        
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript(expectedTranscript)
                .setConfidence(0.95f)
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudio(validBase64Audio);
            
            // Assert
            assertThat(actualTranscript).isEqualTo(expectedTranscript);
            verify(mockSpeechClient).recognize(any(RecognitionConfig.class), any(RecognitionAudio.class));
            verify(mockSpeechClient).close();
        }
    }

    @Test
    void transcribeAudio_WithBase64Prefix_RemovesPrefixAndTranscribes() throws IOException {
        // Arrange
        String expectedTranscript = "Hello with prefix.";
        
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript(expectedTranscript)
                .setConfidence(0.88f)
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudio(base64AudioWithPrefix);
            
            // Assert
            assertThat(actualTranscript).isEqualTo(expectedTranscript);
            
            // Verify that the audio content was properly decoded (without prefix)
            verify(mockSpeechClient).recognize(
                    argThat(config -> config.getEncoding() == RecognitionConfig.AudioEncoding.WEBM_OPUS),
                    argThat(audio -> {
                        byte[] expectedBytes = Base64.getDecoder().decode(validBase64Audio);
                        ByteString expectedByteString = ByteString.copyFrom(expectedBytes);
                        return audio.getContent().equals(expectedByteString);
                    })
            );
        }
    }

    @Test
    void transcribeAudio_WithMultipleResults_ConcatenatesTranscriptions() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative1 = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("First sentence.")
                .setConfidence(0.92f)
                .build();
        
        SpeechRecognitionAlternative alternative2 = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Second sentence.")
                .setConfidence(0.87f)
                .build();
        
        SpeechRecognitionResult result1 = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative1)
                .build();
        
        SpeechRecognitionResult result2 = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative2)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result1)
                .addResults(result2)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudio(validBase64Audio);
            
            // Assert
            assertThat(actualTranscript).isEqualTo("First sentence. Second sentence.");
        }
    }

    @Test
    void transcribeAudio_WithEmptyResults_ReturnsEmptyString() throws IOException {
        // Arrange
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudio(validBase64Audio);
            
            // Assert
            assertThat(actualTranscript).isEmpty();
        }
    }

    @Test
    void transcribeAudio_WithEmptyAlternatives_ReturnsEmptyString() throws IOException {
        // Arrange
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .build(); // No alternatives
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudio(validBase64Audio);
            
            // Assert
            assertThat(actualTranscript).isEmpty();
        }
    }

    @Test
    void transcribeAudio_WithIOException_ThrowsRuntimeException() {
        // Arrange
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create)
                    .thenThrow(new IOException("Failed to create speech client"));
            
            // Act & Assert
            assertThatThrownBy(() -> googleSpeechClient.transcribeAudio(validBase64Audio))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Failed to transcribe audio")
                    .hasCauseInstanceOf(IOException.class);
        }
    }

    @Test
    void transcribeAudio_WithRecognitionException_ThrowsRuntimeException() throws IOException {
        // Arrange
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenThrow(new RuntimeException("Speech recognition failed"));
            
            // Act & Assert
            assertThatThrownBy(() -> googleSpeechClient.transcribeAudio(validBase64Audio))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Failed to transcribe audio");
        }
    }

    @Test
    void transcribeAudio_ConfiguresCorrectRecognitionSettings() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Test")
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            googleSpeechClient.transcribeAudio(validBase64Audio);
            
            // Assert
            verify(mockSpeechClient).recognize(
                    argThat(config -> {
                        return config.getEncoding() == RecognitionConfig.AudioEncoding.WEBM_OPUS &&
                               config.getSampleRateHertz() == 16000 &&
                               config.getLanguageCode().equals("en-US") &&
                               config.getAlternativeLanguageCodesList().contains("ko-KR") &&
                               config.getModel().equals("latest_long") &&
                               config.getUseEnhanced();
                    }),
                    any(RecognitionAudio.class)
            );
        }
    }

    @Test
    void transcribeAudio_WithInvalidBase64_ThrowsRuntimeException() {
        // Arrange
        String invalidBase64 = "invalid-base64-data!!!";
        
        // Act & Assert
        assertThatThrownBy(() -> googleSpeechClient.transcribeAudio(invalidBase64))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to transcribe audio");
    }

    @Test
    void transcribeAudioWithMultipleFormats_WithSuccessfulFirstFormat_ReturnsTranscription() throws IOException {
        // Arrange
        String expectedTranscript = "Multi-format transcription success.";
        
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript(expectedTranscript)
                .setConfidence(0.91f)
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudioWithMultipleFormats(validBase64Audio);
            
            // Assert
            assertThat(actualTranscript).isEqualTo(expectedTranscript);
            
            // Verify only first format was tried (WEBM_OPUS)
            verify(mockSpeechClient, times(1)).recognize(
                    argThat(config -> config.getEncoding() == RecognitionConfig.AudioEncoding.WEBM_OPUS),
                    any(RecognitionAudio.class)
            );
        }
    }

    @Test
    void transcribeAudioWithMultipleFormats_WithFirstFormatFailing_TriesNextFormat() throws IOException {
        // Arrange
        String expectedTranscript = "Second format success.";
        
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript(expectedTranscript)
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            // Create separate mock instances for each format attempt
            SpeechClient firstAttemptClient = mock(SpeechClient.class);
            SpeechClient secondAttemptClient = mock(SpeechClient.class);
            
            mockedSpeechClient.when(SpeechClient::create)
                    .thenReturn(firstAttemptClient)
                    .thenReturn(secondAttemptClient);
            
            // First format fails
            when(firstAttemptClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenThrow(new RuntimeException("WEBM_OPUS format failed"));
            
            // Second format succeeds
            when(secondAttemptClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudioWithMultipleFormats(validBase64Audio);
            
            // Assert
            assertThat(actualTranscript).isEqualTo(expectedTranscript);
            
            // Verify both clients were used
            verify(firstAttemptClient).recognize(any(RecognitionConfig.class), any(RecognitionAudio.class));
            verify(secondAttemptClient).recognize(any(RecognitionConfig.class), any(RecognitionAudio.class));
            verify(firstAttemptClient).close();
            verify(secondAttemptClient).close();
        }
    }

    @Test
    void transcribeAudioWithMultipleFormats_WithAllFormatsFailing_ThrowsRuntimeException() throws IOException {
        // Arrange
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            // Create 5 separate mock instances for each format attempt
            SpeechClient[] mockClients = new SpeechClient[5];
            for (int i = 0; i < 5; i++) {
                mockClients[i] = mock(SpeechClient.class);
                when(mockClients[i].recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                        .thenThrow(new RuntimeException("Format " + i + " failed"));
            }
            
            mockedSpeechClient.when(SpeechClient::create)
                    .thenReturn(mockClients[0], mockClients[1], mockClients[2], mockClients[3], mockClients[4]);
            
            // Act & Assert
            assertThatThrownBy(() -> googleSpeechClient.transcribeAudioWithMultipleFormats(validBase64Audio))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Failed to transcribe audio with any supported format");
            
            // Verify all clients were used and closed
            for (SpeechClient client : mockClients) {
                verify(client).recognize(any(RecognitionConfig.class), any(RecognitionAudio.class));
                verify(client).close();
            }
        }
    }

    @Test
    void transcribeAudioWithMultipleFormats_WithEmptyResult_ReturnsEmptyString() throws IOException {
        // Arrange
        SpeechRecognitionResult emptyResult = SpeechRecognitionResult.newBuilder()
                .build(); // No alternatives
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(emptyResult)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudioWithMultipleFormats(validBase64Audio);
            
            // Assert
            assertThat(actualTranscript).isEmpty();
        }
    }

    @Test
    void transcribeAudioWithMultipleFormats_ConfiguresEnhancedSettings() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Test")
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            googleSpeechClient.transcribeAudioWithMultipleFormats(validBase64Audio);
            
            // Assert - Verify enhanced configuration settings
            verify(mockSpeechClient).recognize(
                    argThat(config -> {
                        return config.getSampleRateHertz() == 16000 &&
                               config.getLanguageCode().equals("en-US") &&
                               config.getAlternativeLanguageCodesList().contains("ko-KR") &&
                               config.getModel().equals("latest_long") &&
                               config.getUseEnhanced() &&
                               !config.getProfanityFilter() &&
                               config.getEnableAutomaticPunctuation() &&
                               !config.getEnableWordTimeOffsets();
                    }),
                    any(RecognitionAudio.class)
            );
        }
    }

    @Test
    void transcribeAudioWithTimestamps_WithValidAudio_ReturnsTranscriptions() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative1 = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("First timestamp segment.")
                .build();
        
        SpeechRecognitionAlternative alternative2 = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Second timestamp segment.")
                .build();
        
        SpeechRecognitionResult result1 = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative1)
                .build();
        
        SpeechRecognitionResult result2 = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative2)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result1)
                .addResults(result2)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            List<String> actualTranscripts = googleSpeechClient.transcribeAudioWithTimestamps(validBase64Audio);
            
            // Assert
            assertThat(actualTranscripts).hasSize(2);
            assertThat(actualTranscripts).containsExactly(
                    "First timestamp segment.",
                    "Second timestamp segment."
            );
        }
    }

    @Test
    void transcribeAudioWithTimestamps_WithEmptyResults_ReturnsEmptyList() throws IOException {
        // Arrange
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            List<String> actualTranscripts = googleSpeechClient.transcribeAudioWithTimestamps(validBase64Audio);
            
            // Assert
            assertThat(actualTranscripts).isEmpty();
        }
    }

    @Test
    void transcribeAudioWithTimestamps_ConfiguresTimestampSettings() throws IOException {
        // Arrange
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            googleSpeechClient.transcribeAudioWithTimestamps(validBase64Audio);
            
            // Assert - Verify timestamp-specific configuration
            verify(mockSpeechClient).recognize(
                    argThat(config -> {
                        return config.getEncoding() == RecognitionConfig.AudioEncoding.WEBM_OPUS &&
                               config.getSampleRateHertz() == 16000 &&
                               config.getLanguageCode().equals("en-US") &&
                               config.getAlternativeLanguageCodesList().contains("ko-KR") &&
                               config.getModel().equals("latest_long") &&
                               config.getUseEnhanced() &&
                               config.getEnableWordTimeOffsets() && // Key difference for timestamps
                               config.getEnableAutomaticPunctuation();
                    }),
                    any(RecognitionAudio.class)
            );
        }
    }

    @Test
    void transcribeAudioWithTimestamps_WithException_ThrowsRuntimeException() throws IOException {
        // Arrange
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenThrow(new RuntimeException("Timestamp transcription failed"));
            
            // Act & Assert
            assertThatThrownBy(() -> googleSpeechClient.transcribeAudioWithTimestamps(validBase64Audio))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Failed to transcribe audio with timestamps");
        }
    }

    @Test
    void transcribeAudioWithTimestamps_WithBase64Prefix_HandlesCorrectly() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Prefix handled correctly.")
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            List<String> actualTranscripts = googleSpeechClient.transcribeAudioWithTimestamps(base64AudioWithPrefix);
            
            // Assert
            assertThat(actualTranscripts).hasSize(1);
            assertThat(actualTranscripts.get(0)).isEqualTo("Prefix handled correctly.");
            
            // Verify correct audio content was used (without prefix)
            verify(mockSpeechClient).recognize(
                    any(RecognitionConfig.class),
                    argThat(audio -> {
                        byte[] expectedBytes = Base64.getDecoder().decode(validBase64Audio);
                        ByteString expectedByteString = ByteString.copyFrom(expectedBytes);
                        return audio.getContent().equals(expectedByteString);
                    })
            );
        }
    }

    @Test
    void allMethods_HandleBase64DecodingCorrectly() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Decoded correctly")
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            // Create multiple mock clients for the 6 method calls (2 inputs × 3 methods)
            SpeechClient[] mockClients = new SpeechClient[6];
            for (int i = 0; i < 6; i++) {
                mockClients[i] = mock(SpeechClient.class);
                when(mockClients[i].recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                        .thenReturn(response);
            }
            
            mockedSpeechClient.when(SpeechClient::create)
                    .thenReturn(mockClients[0], mockClients[1], mockClients[2], 
                               mockClients[3], mockClients[4], mockClients[5]);
            
            // Test each method with both prefixed and non-prefixed base64
            String[] testInputs = {validBase64Audio, base64AudioWithPrefix};
            
            for (String input : testInputs) {
                // Act & Assert - Each method should handle base64 correctly
                assertThat(googleSpeechClient.transcribeAudio(input)).isEqualTo("Decoded correctly");
                assertThat(googleSpeechClient.transcribeAudioWithMultipleFormats(input)).isEqualTo("Decoded correctly");
                assertThat(googleSpeechClient.transcribeAudioWithTimestamps(input)).containsExactly("Decoded correctly");
            }
            
            // Verify all calls used the correct audio content
            byte[] expectedBytes = Base64.getDecoder().decode(validBase64Audio);
            ByteString expectedByteString = ByteString.copyFrom(expectedBytes);
            
            // Verify each client was used with correct audio content
            for (SpeechClient client : mockClients) {
                verify(client).recognize(
                        any(RecognitionConfig.class),
                        argThat(audio -> audio.getContent().equals(expectedByteString))
                );
                verify(client).close();
            }
        }
    }

    @Test
    void transcribeAudioWithMultipleFormats_TestsAllAudioFormats() throws IOException {
        // Arrange
        RecognitionConfig.AudioEncoding[] expectedFormats = {
                RecognitionConfig.AudioEncoding.WEBM_OPUS,
                RecognitionConfig.AudioEncoding.OGG_OPUS,
                RecognitionConfig.AudioEncoding.FLAC,
                RecognitionConfig.AudioEncoding.LINEAR16,
                RecognitionConfig.AudioEncoding.FLAC // Note: FLAC appears twice in the original implementation
        };
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            // Create separate mock instances for each format attempt
            SpeechClient[] mockClients = new SpeechClient[5];
            for (int i = 0; i < 5; i++) {
                mockClients[i] = mock(SpeechClient.class);
                when(mockClients[i].recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                        .thenThrow(new RuntimeException("Format failed"));
            }
            
            mockedSpeechClient.when(SpeechClient::create)
                    .thenReturn(mockClients[0], mockClients[1], mockClients[2], mockClients[3], mockClients[4]);
            
            // Act & Assert
            assertThatThrownBy(() -> googleSpeechClient.transcribeAudioWithMultipleFormats(validBase64Audio))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Failed to transcribe audio with any supported format");
            
            // Verify all clients were used (one for each format)
            for (int i = 0; i < mockClients.length; i++) {
                verify(mockClients[i]).recognize(any(RecognitionConfig.class), any(RecognitionAudio.class));
                verify(mockClients[i]).close();
            }
        }
    }

    @Test
    void allMethods_ProperlyClosesSpeechClient() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Test")
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            // Create separate mock instances for each method call
            SpeechClient client1 = mock(SpeechClient.class);
            SpeechClient client2 = mock(SpeechClient.class);
            SpeechClient client3 = mock(SpeechClient.class);
            
            mockedSpeechClient.when(SpeechClient::create)
                    .thenReturn(client1)
                    .thenReturn(client2)
                    .thenReturn(client3);
            
            when(client1.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            when(client2.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            when(client3.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act - Test each method
            googleSpeechClient.transcribeAudio(validBase64Audio);
            googleSpeechClient.transcribeAudioWithMultipleFormats(validBase64Audio);
            googleSpeechClient.transcribeAudioWithTimestamps(validBase64Audio);
            
            // Assert - Verify each SpeechClient was closed
            verify(client1).close();
            verify(client2).close();
            verify(client3).close();
        }
    }

    @Test
    void allMethods_HandleNullAndEmptyInputsGracefully() {
        // Test null input
        assertThatThrownBy(() -> googleSpeechClient.transcribeAudio(null))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to transcribe audio");
        
        assertThatThrownBy(() -> googleSpeechClient.transcribeAudioWithMultipleFormats(null))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to transcribe audio with any supported format");
        
        assertThatThrownBy(() -> googleSpeechClient.transcribeAudioWithTimestamps(null))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to transcribe audio with timestamps");
        
        // Test empty string input
        assertThatThrownBy(() -> googleSpeechClient.transcribeAudio(""))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to transcribe audio");
        
        assertThatThrownBy(() -> googleSpeechClient.transcribeAudioWithMultipleFormats(""))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to transcribe audio with any supported format");
        
        assertThatThrownBy(() -> googleSpeechClient.transcribeAudioWithTimestamps(""))
                .isInstanceOf(RuntimeException.class)
                .hasMessage("Failed to transcribe audio with timestamps");
    }

    @Test
    void transcribeAudio_WithMultipleAlternativesPerResult_UsesFirstAlternative() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative1 = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("First alternative")
                .setConfidence(0.95f)
                .build();
        
        SpeechRecognitionAlternative alternative2 = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Second alternative")
                .setConfidence(0.85f)
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative1)
                .addAlternatives(alternative2)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudio(validBase64Audio);
            
            // Assert - Should only use first alternative (highest confidence)
            assertThat(actualTranscript).isEqualTo("First alternative");
        }
    }

    @Test
    void transcribeAudioWithMultipleFormats_WithStreamMethods_ReturnsFirstAlternative() throws IOException {
        // Arrange
        SpeechRecognitionAlternative alternative1 = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Stream result first")
                .setConfidence(0.90f)
                .build();
        
        SpeechRecognitionAlternative alternative2 = SpeechRecognitionAlternative.newBuilder()
                .setTranscript("Stream result second")
                .setConfidence(0.80f)
                .build();
        
        SpeechRecognitionResult result = SpeechRecognitionResult.newBuilder()
                .addAlternatives(alternative1)
                .addAlternatives(alternative2)
                .build();
        
        RecognizeResponse response = RecognizeResponse.newBuilder()
                .addResults(result)
                .build();
        
        try (MockedStatic<SpeechClient> mockedSpeechClient = mockStatic(SpeechClient.class)) {
            mockedSpeechClient.when(SpeechClient::create).thenReturn(mockSpeechClient);
            when(mockSpeechClient.recognize(any(RecognitionConfig.class), any(RecognitionAudio.class)))
                    .thenReturn(response);
            
            // Act
            String actualTranscript = googleSpeechClient.transcribeAudioWithMultipleFormats(validBase64Audio);
            
            // Assert - Uses stream.findFirst() which should return the first alternative
            assertThat(actualTranscript).isEqualTo("Stream result first");
        }
    }
}