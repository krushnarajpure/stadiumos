import logging

logger = logging.getLogger("fastapi")

class TwilioClient:
    def __init__(self):
        logger.info("Initializing Twilio SMS gateway API client...")

    def send_sms(self, phone_number: str, message: str) -> bool:
        # Simulated Twilio POST API request
        logger.info(f"Twilio: Dispatched SMS to '{phone_number}' - Content: '{message}'")
        return True

# Singleton Instance
twilio_client = TwilioClient()
