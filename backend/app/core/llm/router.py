import litellm
from typing import AsyncGenerator, List, Dict
from app.config import settings

litellm.drop_params = True

class LLMRouter:
    def __init__(self):
        self.default_model = settings.default_model
        self.vision_model = settings.vision_model

    async def stream_completion(self, messages: List[Dict], model: str = None) -> AsyncGenerator[str, None]:
        target_model = model or self.default_model
        response = await litellm.acompletion(
            model=target_model,
            messages=messages,
            stream=True
        )
        async for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def completion(self, messages: List[Dict], model: str = None) -> str:
        target_model = model or self.default_model
        response = await litellm.acompletion(
            model=target_model,
            messages=messages
        )
        return response.choices[0].message.content

    async def vision_completion(self, messages: List[Dict], images: List[str]) -> str:
        # Simplification of vision injection
        return await self.completion(messages, model=self.vision_model)

llm_router = LLMRouter()
