import re
import logging
from fastapi import HTTPException, status
from typing import List, Dict, Any

logger = logging.getLogger("fastapi")

class AISecurityGuardrails:
    @staticmethod
    def detect_prompt_injection(prompt: str) -> None:
        # Define adversarial pattern regex checks
        injection_patterns = [
            r"(ignore previous instructions|ignore original guidelines)",
            r"(system override|bypass constraints|developer bypass)",
            r"(you are no longer|act as|system administrator prompt)",
            r"(reveal your developer system prompt|system rules disclosure)"
        ]
        
        prompt_lower = prompt.lower()
        for pattern in injection_patterns:
            if re.search(pattern, prompt_lower):
                logger.critical(f"Security Alert: Prompt injection attempt detected. Payload: '{prompt}'")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Input prompt failed strict safety verification checks."
                )

    @staticmethod
    def redact_pii_entities(text: str) -> str:
        # Regex mappings to identify and redact sensitive information
        redacted = text
        # Redact email addresses
        redacted = re.sub(r"[\w\.-]+@[\w\.-]+\.\w+", "[REDACTED_EMAIL]", redacted)
        # Redact phone numbers
        redacted = re.sub(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[REDACTED_PHONE]", redacted)
        # Redact generic identification/credit card sequences
        redacted = re.sub(r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b", "[REDACTED_CC]", redacted)
        return redacted

    @staticmethod
    def validate_tool_permissions(role: str, tool_name: str) -> None:
        # Standard RBAC mappings for tool invocations
        allowed_tools = {
            "Security Staff": ["get_crowd_status", "get_camera_events", "trigger_notification"],
            "Medical Staff": ["get_crowd_status", "get_medical_alerts", "trigger_notification"],
            "Operations Manager": ["get_crowd_status", "get_predictions", "get_camera_events", "get_medical_alerts", "get_vendor_inventory", "get_transport_status", "assign_volunteer", "trigger_notification", "generate_route", "fetch_knowledge_base"],
            "Administrator": ["get_crowd_status", "get_predictions", "get_camera_events", "get_medical_alerts", "get_vendor_inventory", "get_transport_status", "assign_volunteer", "trigger_notification", "generate_route", "fetch_knowledge_base"]
        }

        # Deny operations if role not registered or tool not allowed
        allowed = allowed_tools.get(role, [])
        if tool_name not in allowed:
            logger.critical(f"Access Violation: Role '{role}' attempted unauthorized call on Tool '{tool_name}'")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Role '{role}' is not authorized to invoke tool '{tool_name}'."
            )

    @staticmethod
    def filter_rag_documents(user_roles: List[str], documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # Enforce dynamic classification-based document filtering
        filtered = []
        is_admin_or_ops = "Administrator" in user_roles or "Operations Manager" in user_roles
        
        for doc in documents:
            title = doc.get("title", "")
            # Restrict security and operations manuals strictly to Admin and Ops Managers
            if "Safety Standards" in title and not is_admin_or_ops:
                continue
            filtered.append(doc)
            
        return filtered
