"""
OpenAI Service Wrapper
Handles OpenAI API calls for backend services
"""

import httpx
import os
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        self.api_key = os.getenv("VITE_OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.base_url = "https://api.openai.com/v1"
        
    async def create_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7
    ) -> Dict[str, Any]:
        """Create chat completion"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": temperature
                    },
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    logger.error(f"OpenAI API error: {response.status_code} {response.text}")
                    raise Exception(f"OpenAI API error: {response.status_code}")
                
                return response.json()
        except Exception as e:
            logger.error(f"OpenAI request failed: {e}")
            raise



