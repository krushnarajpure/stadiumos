import json
from typing import Optional
from confluent_kafka import Producer, Consumer
from app.core.config import settings
import logging

logger = logging.getLogger("fastapi")

class KafkaClient:
    def __init__(self):
        # Configure producer parameter configs
        self.producer_config = {
            'bootstrap.servers': settings.STADIUMOS_KAFKA_BROKERS,
            'enable.idempotence': True,
            'retries': 3
        }
        self.producer = None
        try:
            self.producer = Producer(self.producer_config)
        except Exception as e:
            logger.warning(f"Failed to load Kafka producer client. Reason: {str(e)}")

    def publish_event(self, topic: str, key: str, payload: dict) -> None:
        if not self.producer:
            logger.warning(f"Kafka producer unavailable. Skipping emit event topic '{topic}'")
            return
        
        try:
            serialized_payload = json.dumps(payload).encode('utf-8')
            self.producer.produce(
                topic,
                key=key.encode('utf-8'),
                value=serialized_payload,
                callback=self._delivery_report
            )
            # Trigger asynchronous delivery queues
            self.producer.poll(0)
        except Exception as e:
            logger.error(f"Failed to publish Kafka event to topic '{topic}': {str(e)}")

    def _delivery_report(self, err, msg) -> None:
        if err is not None:
            logger.error(f"Kafka message delivery failed: {err}")
        else:
            logger.debug(f"Kafka message delivered to {msg.topic()} [{msg.partition()}]")

    def get_consumer(self, group_id: str, topics: list[str]) -> Optional[Consumer]:
        consumer_config = {
            'bootstrap.servers': settings.STADIUMOS_KAFKA_BROKERS,
            'group.id': group_id,
            'auto.offset.reset': 'earliest'
        }
        try:
            consumer = Consumer(consumer_config)
            consumer.subscribe(topics)
            return consumer
        except Exception as e:
            logger.error(f"Failed to initialize Kafka consumer: {str(e)}")
            return None

# Singleton Instance
kafka_client = KafkaClient()
