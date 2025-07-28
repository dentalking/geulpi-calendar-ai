package com.geulpi.calendar.external;

import com.google.cloud.vision.v1.*;
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
public class GoogleVisionClient {
    
    public String extractTextFromImage(String base64Image) {
        try (ImageAnnotatorClient vision = ImageAnnotatorClient.create()) {
            // Remove base64 prefix if present
            String imageData = base64Image;
            if (base64Image.contains(",")) {
                imageData = base64Image.split(",")[1];
            }
            
            // Decode base64 image
            byte[] imageBytes = Base64.getDecoder().decode(imageData);
            ByteString imgBytes = ByteString.copyFrom(imageBytes);
            
            // Build image object
            Image img = Image.newBuilder().setContent(imgBytes).build();
            
            // Set features for text detection
            Feature feat = Feature.newBuilder().setType(Feature.Type.TEXT_DETECTION).build();
            AnnotateImageRequest request = AnnotateImageRequest.newBuilder()
                    .addFeatures(feat)
                    .setImage(img)
                    .build();
            
            List<AnnotateImageRequest> requests = List.of(request);
            
            // Perform text detection
            BatchAnnotateImagesResponse response = vision.batchAnnotateImages(requests);
            List<AnnotateImageResponse> responses = response.getResponsesList();
            
            StringBuilder extractedText = new StringBuilder();
            
            for (AnnotateImageResponse res : responses) {
                if (res.hasError()) {
                    log.error("Error in Vision API: {}", res.getError().getMessage());
                    throw new RuntimeException("Failed to process image: " + res.getError().getMessage());
                }
                
                // Get text annotations
                if (!res.getTextAnnotationsList().isEmpty()) {
                    // The first annotation contains the entire detected text
                    EntityAnnotation annotation = res.getTextAnnotations(0);
                    extractedText.append(annotation.getDescription());
                }
            }
            
            String result = extractedText.toString().trim();
            log.info("Extracted text from image: {} characters", result.length());
            
            return result;
            
        } catch (IOException e) {
            log.error("Failed to create Vision client", e);
            throw new RuntimeException("Failed to process image", e);
        } catch (Exception e) {
            log.error("Error processing image", e);
            throw new RuntimeException("Failed to process image", e);
        }
    }
    
    public List<String> detectCalendarText(String base64Image) {
        try (ImageAnnotatorClient vision = ImageAnnotatorClient.create()) {
            // Remove base64 prefix if present
            String imageData = base64Image;
            if (base64Image.contains(",")) {
                imageData = base64Image.split(",")[1];
            }
            
            byte[] imageBytes = Base64.getDecoder().decode(imageData);
            ByteString imgBytes = ByteString.copyFrom(imageBytes);
            
            Image img = Image.newBuilder().setContent(imgBytes).build();
            
            // Use document text detection for better structured text extraction
            Feature feat = Feature.newBuilder().setType(Feature.Type.DOCUMENT_TEXT_DETECTION).build();
            AnnotateImageRequest request = AnnotateImageRequest.newBuilder()
                    .addFeatures(feat)
                    .setImage(img)
                    .build();
            
            BatchAnnotateImagesResponse response = vision.batchAnnotateImages(List.of(request));
            List<AnnotateImageResponse> responses = response.getResponsesList();
            
            for (AnnotateImageResponse res : responses) {
                if (res.hasError()) {
                    log.error("Error in Vision API: {}", res.getError().getMessage());
                    throw new RuntimeException("Failed to process image: " + res.getError().getMessage());
                }
                
                if (res.hasFullTextAnnotation()) {
                    TextAnnotation textAnnotation = res.getFullTextAnnotation();
                    
                    // Extract lines of text that might contain calendar information
                    return textAnnotation.getPagesList().stream()
                            .flatMap(page -> page.getBlocksList().stream())
                            .flatMap(block -> block.getParagraphsList().stream())
                            .map(paragraph -> paragraph.getWordsList().stream()
                                    .map(word -> word.getSymbolsList().stream()
                                            .map(Symbol::getText)
                                            .collect(Collectors.joining()))
                                    .collect(Collectors.joining(" ")))
                            .filter(line -> !line.trim().isEmpty())
                            .collect(Collectors.toList());
                }
            }
            
            return List.of();
            
        } catch (Exception e) {
            log.error("Error detecting calendar text from image", e);
            throw new RuntimeException("Failed to detect calendar text", e);
        }
    }
}