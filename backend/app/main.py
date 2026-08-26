import contextlib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import chat, documents, conversations, vision
from app.db.database import init_db
from app.db.redis_client import init_redis, close_redis
from app.core.mcp.client_manager import mcp_manager
from loguru import logger

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing RayGPT 2.0 Backend...")
    await init_db()
    await init_redis()
    await mcp_manager.initialize()
    logger.info("RayGPT 2.0 Backend started successfully.")
    yield
    logger.info("Shutting down RayGPT 2.0 Backend...")
    await close_redis()
    await mcp_manager.shutdown()
    logger.info("Shutdown complete.")

app = FastAPI(title="RayGPT 2.0 API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/api/v1/chat", tags=["Chat"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(conversations.router, prefix="/api/v1/conversations", tags=["Conversations"])
app.include_router(vision.router, prefix="/api/v1/vision", tags=["Vision"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "2.0.0"}
