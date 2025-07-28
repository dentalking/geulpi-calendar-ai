package com.geulpi.calendar.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
@RequiredArgsConstructor
@Slf4j
public class KafkaProducer {
    
    private final KafkaTemplate<String, Object> kafkaTemplate;
    
    @Value("${kafka.topics.ml-requests}")
    private String mlRequestsTopic;
    
    @Value("${kafka.topics.ml-responses}")
    private String mlResponsesTopic;
    
    public CompletableFuture<SendResult<String, Object>> sendMLRequest(String requestId, Object request) {
        log.debug("Sending ML request {} to topic {}", requestId, mlRequestsTopic);
        return kafkaTemplate.send(mlRequestsTopic, requestId, request);
    }
    
    public CompletableFuture<SendResult<String, Object>> sendMLResponse(String requestId, Object response) {
        log.debug("Sending ML response {} to topic {}", requestId, mlResponsesTopic);
        return kafkaTemplate.send(mlResponsesTopic, requestId, response);
    }
    
    public CompletableFuture<SendResult<String, Object>> sendToTopic(String topic, String key, Object message) {
        log.debug("Sending message with key {} to topic {}", key, topic);
        return kafkaTemplate.send(topic, key, message);
    }
}