"""
LLM Provider Abstraction Layer.
Defines the interface and factory for all supported LLM providers.
Supports: OpenAI, Google Gemini, Anthropic Claude, Groq, OpenRouter, Local Ollama.
"""
import os
import time
import json
import logging
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from dataclasses import dataclass

logger = logging.getLogger("copilot")


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    latency_ms: float = 0.0
    finish_reason: str = "stop"


class LLMProvider(ABC):
    """Abstract base class for all LLM providers."""

    @abstractmethod
    async def generate(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 2048,
        response_format: Optional[dict] = None,
    ) -> LLMResponse:
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ) -> AsyncIterator[str]:
        ...


# ──────────────────────────────────────────────
# OpenAI-Compatible Provider (works for OpenAI, Groq, OpenRouter)
# ──────────────────────────────────────────────
class OpenAICompatibleProvider(LLMProvider):
    """Handles OpenAI, Groq, and OpenRouter via the same OpenAI SDK interface."""

    def __init__(self, api_key: str, model: str, base_url: Optional[str] = None, provider_name: str = "openai"):
        self.model = model
        self.provider_name = provider_name
        try:
            from openai import AsyncOpenAI
            kwargs = {"api_key": api_key}
            if base_url:
                kwargs["base_url"] = base_url
            self.client = AsyncOpenAI(**kwargs)
        except ImportError:
            raise RuntimeError(f"openai package required for {provider_name} provider. Run: pip install openai")

    async def generate(self, messages, temperature=0.3, max_tokens=2048, response_format=None) -> LLMResponse:
        t0 = time.time()
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if response_format:
            from pydantic import BaseModel
            if isinstance(response_format, type) and issubclass(response_format, BaseModel):
                if self.provider_name == "openai":
                    kwargs["response_format"] = response_format
                else:
                    kwargs["response_format"] = {"type": "json_object"}
            else:
                kwargs["response_format"] = response_format

        resp = await self.client.chat.completions.create(**kwargs)
        latency = (time.time() - t0) * 1000

        choice = resp.choices[0]
        usage = resp.usage or type("U", (), {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0})()
        return LLMResponse(
            content=choice.message.content or "",
            model=self.model,
            provider=self.provider_name,
            prompt_tokens=usage.prompt_tokens,
            completion_tokens=usage.completion_tokens,
            total_tokens=usage.total_tokens,
            latency_ms=round(latency, 1),
            finish_reason=choice.finish_reason or "stop",
        )

    async def stream(self, messages, temperature=0.3, max_tokens=2048) -> AsyncIterator[str]:
        resp = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in resp:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                yield delta.content


# ──────────────────────────────────────────────
# Google Gemini Provider
# ──────────────────────────────────────────────
class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-2.5-flash"):
        self.model = model
        self.api_key = api_key
        self.provider_name = "gemini"
        try:
            from google import genai
            self.client = genai.Client(api_key=api_key)
        except ImportError:
            raise RuntimeError("google-genai package required. Run: pip install google-genai")

    async def generate(self, messages, temperature=0.3, max_tokens=2048, response_format=None) -> LLMResponse:
        from google.genai import types
        t0 = time.time()

        # Convert OpenAI-style messages to Gemini content format
        contents = []
        system_instruction = None
        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            else:
                role = "user" if msg["role"] == "user" else "model"
                contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_instruction,
        )
        if response_format:
            config.response_mime_type = "application/json"
            config.response_schema = response_format

        resp = self.client.models.generate_content(
            model=self.model,
            contents=contents,
            config=config,
        )
        latency = (time.time() - t0) * 1000
        text = resp.text or ""
        usage = resp.usage_metadata
        return LLMResponse(
            content=text,
            model=self.model,
            provider="gemini",
            prompt_tokens=getattr(usage, "prompt_token_count", 0) if usage else 0,
            completion_tokens=getattr(usage, "candidates_token_count", 0) if usage else 0,
            total_tokens=getattr(usage, "total_token_count", 0) if usage else 0,
            latency_ms=round(latency, 1),
        )

    async def stream(self, messages, temperature=0.3, max_tokens=2048) -> AsyncIterator[str]:
        from google.genai import types
        contents = []
        system_instruction = None
        for msg in messages:
            if msg["role"] == "system":
                system_instruction = msg["content"]
            else:
                role = "user" if msg["role"] == "user" else "model"
                contents.append(types.Content(role=role, parts=[types.Part(text=msg["content"])]))

        config = types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
            system_instruction=system_instruction,
        )

        for chunk in self.client.models.generate_content_stream(
            model=self.model, contents=contents, config=config
        ):
            if chunk.text:
                yield chunk.text


# ──────────────────────────────────────────────
# Anthropic Claude Provider
# ──────────────────────────────────────────────
class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        self.model = model
        self.provider_name = "anthropic"
        try:
            from anthropic import AsyncAnthropic
            self.client = AsyncAnthropic(api_key=api_key)
        except ImportError:
            raise RuntimeError("anthropic package required. Run: pip install anthropic")

    async def generate(self, messages, temperature=0.3, max_tokens=2048, response_format=None) -> LLMResponse:
        t0 = time.time()
        system_msg = ""
        chat_msgs = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                chat_msgs.append({"role": m["role"], "content": m["content"]})

        resp = await self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_msg,
            messages=chat_msgs,
        )
        latency = (time.time() - t0) * 1000
        text = resp.content[0].text if resp.content else ""
        return LLMResponse(
            content=text,
            model=self.model,
            provider="anthropic",
            prompt_tokens=resp.usage.input_tokens,
            completion_tokens=resp.usage.output_tokens,
            total_tokens=resp.usage.input_tokens + resp.usage.output_tokens,
            latency_ms=round(latency, 1),
            finish_reason=resp.stop_reason or "stop",
        )

    async def stream(self, messages, temperature=0.3, max_tokens=2048) -> AsyncIterator[str]:
        system_msg = ""
        chat_msgs = []
        for m in messages:
            if m["role"] == "system":
                system_msg = m["content"]
            else:
                chat_msgs.append({"role": m["role"], "content": m["content"]})

        async with self.client.messages.stream(
            model=self.model,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_msg,
            messages=chat_msgs,
        ) as stream:
            async for text in stream.text_stream:
                yield text


# ──────────────────────────────────────────────
# Ollama (Local) Provider
# ──────────────────────────────────────────────
class OllamaProvider(LLMProvider):
    def __init__(self, model: str = "llama3.1", base_url: str = "http://localhost:11434"):
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.provider_name = "ollama"

    async def generate(self, messages, temperature=0.3, max_tokens=2048, response_format=None) -> LLMResponse:
        import aiohttp
        t0 = time.time()
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        if response_format:
            payload["format"] = "json"

        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/api/chat", json=payload) as resp:
                data = await resp.json()

        latency = (time.time() - t0) * 1000
        return LLMResponse(
            content=data.get("message", {}).get("content", ""),
            model=self.model,
            provider="ollama",
            prompt_tokens=data.get("prompt_eval_count", 0),
            completion_tokens=data.get("eval_count", 0),
            total_tokens=data.get("prompt_eval_count", 0) + data.get("eval_count", 0),
            latency_ms=round(latency, 1),
        )

    async def stream(self, messages, temperature=0.3, max_tokens=2048) -> AsyncIterator[str]:
        import aiohttp
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": temperature, "num_predict": max_tokens},
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{self.base_url}/api/chat", json=payload) as resp:
                async for line in resp.content:
                    if line:
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue


# ──────────────────────────────────────────────
# Provider Factory
# ──────────────────────────────────────────────
def create_llm_provider() -> LLMProvider:
    """
    Factory function — reads environment variables and returns the configured provider.
    """
    from app.core.config import settings

    provider = (settings.COPILOT_LLM_PROVIDER or settings.LLM_PROVIDER or "gemini").lower()
    if provider == "google":
        provider = "gemini"
    model_override = settings.COPILOT_LLM_MODEL

    if provider == "openai":
        return OpenAICompatibleProvider(
            api_key=settings.OPENAI_API_KEY,
            model=model_override or "gpt-4o",
            provider_name="openai",
        )
    elif provider == "gemini":
        return GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model=model_override or "gemini-2.5-flash",
        )
    elif provider == "anthropic":
        return AnthropicProvider(
            api_key=settings.ANTHROPIC_API_KEY,
            model=model_override or "claude-sonnet-4-20250514",
        )
    elif provider == "groq":
        return OpenAICompatibleProvider(
            api_key=settings.GROQ_API_KEY,
            model=model_override or "llama-3.3-70b-versatile",
            base_url="https://api.groq.com/openai/v1",
            provider_name="groq",
        )
    elif provider == "openrouter":
        return OpenAICompatibleProvider(
            api_key=settings.OPENROUTER_API_KEY,
            model=model_override or "google/gemini-2.5-flash",
            base_url="https://openrouter.ai/api/v1",
            provider_name="openrouter",
        )
    elif provider == "ollama":
        return OllamaProvider(
            model=model_override or "llama3.1",
            base_url=settings.OLLAMA_BASE_URL,
        )
    else:
        raise ValueError(f"Unknown LLM provider: {provider}. Supported: openai, gemini, anthropic, groq, openrouter, ollama")
