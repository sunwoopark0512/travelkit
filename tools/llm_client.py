import os, json, time, random
from typing import Optional, Dict, Any, List
import requests

class LLMError(Exception):
    pass

def _require_env(name: str) -> str:
    v = os.getenv(name, "").strip()
    if not v:
        raise LLMError(f"Missing env var: {name}")
    return v

def call_openai_json_only(prompt: str, model: str, timeout: int = 60) -> Dict[str, Any]:
    api_key = _require_env("OPENAI_API_KEY")
    
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": model,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": "You must output ONLY valid JSON. No markdown, no commentary."},
            {"role": "user", "content": prompt},
        ],
    }
    r = requests.post(url, headers=headers, data=json.dumps(body), timeout=timeout)
    if r.status_code >= 400:
        raise LLMError(f"OpenAI HTTP {r.status_code}: {r.text[:300]}")
    data = r.json()
    text = data["choices"][0]["message"]["content"]
    try:
        return json.loads(text)
    except Exception as e:
        raise LLMError(f"JSON parse failed: {e}. Raw: {text[:300]}")

def call_llm_json(prompt: str, provider: str, model: str) -> Dict[str, Any]:
    provider = (provider or "openai").lower().strip()
    if provider == "openai":
        return call_openai_json_only(prompt, model=model)
    elif provider == "mock":
        return call_openai_json_only(prompt, model=model) 
    raise LLMError(f"Unsupported provider: {provider}")

def backoff_sleep(attempt: int, base: float = 1.0, cap: float = 20.0) -> None:
    # exponential backoff + jitter
    s = min(cap, base * (2 ** max(0, attempt - 1)))
    s = s + random.random()
    time.sleep(s)
