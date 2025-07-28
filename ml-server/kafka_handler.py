import json
import asyncio
import logging
from typing import Dict, Optional, Callable
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError
import threading
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class KafkaHandler:
    def __init__(self):
        self.bootstrap_servers = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092").split(",")
        self.consumer_group = os.getenv("KAFKA_CONSUMER_GROUP", "ml-server-group")
        self.consumer_topics = [os.getenv("KAFKA_REQUEST_TOPIC", "ml-requests")]
        self.producer_topic = os.getenv("KAFKA_RESPONSE_TOPIC", "ml-responses")
        self.event_topic = os.getenv("KAFKA_EVENT_TOPIC", "ml-events")
        
        self.consumer: Optional[KafkaConsumer] = None
        self.producer: Optional[KafkaProducer] = None
        self.consumer_thread: Optional[threading.Thread] = None
        self.running = False
        self.message_handlers: Dict[str, Callable] = {}
        
    def register_handler(self, message_type: str, handler: Callable):
        """Register a handler function for a specific message type"""
        self.message_handlers[message_type] = handler
        logger.info(f"Registered handler for message type: {message_type}")
    
    def start(self):
        """Start Kafka consumer and producer"""
        try:
            # Initialize producer
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                key_serializer=lambda k: k.encode('utf-8') if k else None,
                retries=5,
                max_in_flight_requests_per_connection=1
            )
            logger.info("Kafka producer initialized successfully")
            
            # Initialize consumer
            self.consumer = KafkaConsumer(
                *self.consumer_topics,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.consumer_group,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                key_deserializer=lambda k: k.decode('utf-8') if k else None,
                auto_offset_reset='latest',
                enable_auto_commit=True,
                consumer_timeout_ms=1000
            )
            logger.info(f"Kafka consumer initialized for topics: {self.consumer_topics}")
            
            # Start consumer thread
            self.running = True
            self.consumer_thread = threading.Thread(target=self._consume_messages)
            self.consumer_thread.daemon = True
            self.consumer_thread.start()
            logger.info("Kafka consumer thread started")
            
        except Exception as e:
            logger.error(f"Failed to start Kafka handler: {e}")
            raise
    
    def stop(self):
        """Stop Kafka consumer and producer"""
        logger.info("Stopping Kafka handler...")
        self.running = False
        
        if self.consumer_thread:
            self.consumer_thread.join(timeout=5)
        
        if self.consumer:
            self.consumer.close()
            logger.info("Kafka consumer closed")
        
        if self.producer:
            self.producer.flush()
            self.producer.close()
            logger.info("Kafka producer closed")
    
    def _consume_messages(self):
        """Consume messages from Kafka in a separate thread"""
        logger.info("Starting message consumption loop")
        
        while self.running:
            try:
                for message in self.consumer:
                    if not self.running:
                        break
                    
                    self._process_message(message)
                    
            except StopIteration:
                # Consumer timeout - continue loop
                continue
            except Exception as e:
                logger.error(f"Error in consumer loop: {e}")
                if self.running:
                    asyncio.sleep(1)
    
    def _process_message(self, message):
        """Process a single Kafka message"""
        try:
            value = message.value
            logger.info(f"Received message: {message.topic}:{message.partition}:{message.offset}")
            
            # Extract message type and request ID
            message_type = value.get("type")
            request_id = value.get("requestId")
            
            if not message_type:
                logger.error("Message missing 'type' field")
                return
            
            if not request_id:
                logger.error("Message missing 'requestId' field")
                return
            
            # Find and execute handler
            handler = self.message_handlers.get(message_type)
            if handler:
                # Run async handler in new event loop
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    result = loop.run_until_complete(handler(value.get("data", {})))
                    self._send_response(request_id, message_type, result, success=True)
                except Exception as e:
                    logger.error(f"Handler error for {message_type}: {e}")
                    self._send_response(request_id, message_type, {"error": str(e)}, success=False)
                finally:
                    loop.close()
            else:
                logger.warning(f"No handler registered for message type: {message_type}")
                self._send_response(request_id, message_type, 
                                  {"error": f"Unknown message type: {message_type}"}, 
                                  success=False)
                
        except Exception as e:
            logger.error(f"Error processing message: {e}")
    
    def _send_response(self, request_id: str, message_type: str, result: Dict, success: bool):
        """Send response back to Kafka"""
        try:
            response = {
                "requestId": request_id,
                "type": f"{message_type}_response",
                "success": success,
                "timestamp": datetime.now().isoformat(),
                "data": result
            }
            
            future = self.producer.send(
                self.producer_topic,
                key=request_id,
                value=response
            )
            
            # Wait for send to complete
            record_metadata = future.get(timeout=10)
            logger.info(f"Response sent: {self.producer_topic}:{record_metadata.partition}:{record_metadata.offset}")
            
        except KafkaError as e:
            logger.error(f"Failed to send response: {e}")
    
    def send_event(self, event_type: str, data: Dict):
        """Send an event to Kafka (for notifications, alerts, etc.)"""
        try:
            event = {
                "type": event_type,
                "timestamp": datetime.now().isoformat(),
                "source": "ml-server",
                "data": data
            }
            
            self.producer.send(self.event_topic, value=event)
            logger.info(f"Event sent: {event_type}")
            
        except Exception as e:
            logger.error(f"Failed to send event: {e}")
    
    def get_consumer_metrics(self) -> Dict:
        """Get consumer metrics for health check"""
        if not self.consumer:
            return {"status": "not_initialized"}
        
        try:
            metrics = self.consumer.metrics()
            return {
                "status": "active",
                "topics": list(self.consumer.subscription()),
                "partitions": len(self.consumer.assignment()),
                "lag": sum(
                    metrics.get(f"consumer-lag-{tp.topic}-{tp.partition}", 0)
                    for tp in self.consumer.assignment()
                )
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    def get_producer_metrics(self) -> Dict:
        """Get producer metrics for health check"""
        if not self.producer:
            return {"status": "not_initialized"}
        
        try:
            metrics = self.producer.metrics()
            return {
                "status": "active",
                "buffer_available": metrics.get("buffer-available-bytes", 0),
                "records_sent": metrics.get("record-send-total", 0)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}