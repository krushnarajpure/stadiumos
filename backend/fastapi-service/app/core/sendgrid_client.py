import logging

logger = logging.getLogger("fastapi")

class SendGridClient:
    def __init__(self):
        logger.info("Initializing SendGrid Mail Client configuration context...")

    def send_email(self, email: str, subject: str, content: str) -> bool:
        # Simulated SendGrid SMTP/REST API request
        logger.info(f"SendGrid: Dispatched Email to '{email}' - Subject: '{subject}'")
        return True

# Singleton Instance
sendgrid_client = SendGridClient()
