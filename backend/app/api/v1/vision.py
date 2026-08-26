import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from loguru import logger
from app.core.llm.router import llm_router
from typing import Optional

router = APIRouter()

@router.post("/analyze")
async def analyze_image(
    image: UploadFile = File(...),
    prompt: Optional[str] = Form("Describe esta imagen en detalle.")
):
    """
    Analyzes an uploaded image using the Vision model.
    """
    logger.info(f"Received vision analysis request for image: {image.filename}")
    
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")
        
    try:
        content = await image.read()
        base64_image = base64.b64encode(content).decode("utf-8")
        
        # Format the message for vision model
        # Normally you would construct a specific payload depending on the LLM provider.
        # Here we just pass the prompt and the base64 image as expected by our router wrapper.
        messages = [{"role": "user", "content": prompt}]
        
        response = await llm_router.vision_completion(messages=messages, images=[base64_image])
        
        return {"status": "success", "analysis": response}
    except Exception as e:
        logger.error(f"Error in vision analysis: {e}")
        raise HTTPException(status_code=500, detail="Error analyzing image.")
