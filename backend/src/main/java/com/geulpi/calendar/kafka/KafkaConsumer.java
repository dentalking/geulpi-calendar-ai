package com.geulpi.calendar.kafka;

import com.geulpi.calendar.dto.ml.MLResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaConsumer {
    
    private final KafkaMessageHandler messageHandler;
    
    @KafkaListener(topics = "${kafka.topics.ml-responses}", 
                   containerFactory = "kafkaListenerContainerFactory",
                   groupId = "${kafka.consumer.group-id:geulpi-backend}")
    public void handleMLResponse(@Payload MLResponse response,
                                @Header(KafkaHeaders.RECEIVED_KEY) String key,
                                @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                                @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
                                @Header(KafkaHeaders.OFFSET) long offset,
                                Acknowledgment acknowledgment) {
        try {
            log.info("Received ML response from topic: {}, partition: {}, offset: {}, key: {}, type: {}", 
                     topic, partition, offset, key, response.getClass().getSimpleName());
            
            messageHandler.handleMLResponse(response);
            
            acknowledgment.acknowledge();
            log.debug("Successfully acknowledged message with offset: {}", offset);
            
        } catch (Exception e) {
            log.error("Error processing ML response from offset {}: {}", offset, e.getMessage(), e);
            // Don't acknowledge - let it retry based on consumer configuration
        }
    }
    
    @KafkaListener(topics = "${kafka.topics.error-logs:error-logs}", 
                   containerFactory = "kafkaListenerContainerFactory",
                   groupId = "${kafka.consumer.group-id:geulpi-backend}")
    public void handleErrorLogs(@Payload String errorMessage,
                               @Header(KafkaHeaders.RECEIVED_KEY) String key,
                               @Header(KafkaHeaders.RECEIVED_TIMESTAMP) long timestamp,
                               Acknowledgment acknowledgment) {
        try {
            log.error("Received error from ML server at {}: {}", timestamp, errorMessage);
            messageHandler.handleErrorLog(key, errorMessage, timestamp);
            acknowledgment.acknowledge();
        } catch (Exception e) {
            log.error("Error processing error log: {}", e.getMessage(), e);
        }
    }
}