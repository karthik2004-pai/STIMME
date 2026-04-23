"""Stimme — AI Audio Identifier | Main Application"""
import os
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from database import init_db
from services.class_manager import class_manager
from models.model_manager import model_manager
from api.routes_classify import router as classify_router
from api.routes_classes import router as classes_router
from api.routes_training import router as training_router
from api.routes_models import router as models_router
from api.routes_analyze import router as analyze_router
from api.routes_intelligence import router as intelligence_router
from api.routes_voice import router as voice_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    print("=" * 60)
    print("  STIMME -- AI Audio Identifier")
    print("  Starting up...")
    print("=" * 60)

    # Initialize database
    init_db()
    print("[OK] Database initialized")

    # Initialize default classes
    class_manager.initialize_default_classes()
    print("[OK] Sound classes ready")

    # Initialize model manager (loads YAMNet)
    print("[..] Loading YAMNet model (this may take a moment)...")
    model_manager.initialize()
    print("[OK] Model manager ready")

    print("=" * 60)
    print("  >> Stimme is ready at http://localhost:8000")
    print("=" * 60)

    yield

    print("Stimme shutting down...")


app = FastAPI(
    title="Stimme — AI Audio Identifier",
    description="AI-powered audio classification and identification system",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(classify_router)
app.include_router(classes_router)
app.include_router(training_router)
app.include_router(models_router)
app.include_router(analyze_router)
app.include_router(intelligence_router)
app.include_router(voice_router)

# Serve frontend
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")


@app.get("/")
async def serve_root():
    """Serve the main frontend page."""
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


# Mount static files
if os.path.exists(FRONTEND_DIR):
    app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
    app.mount("/js", StaticFiles(directory=os.path.join(FRONTEND_DIR, "js")), name="js")
    if os.path.exists(os.path.join(FRONTEND_DIR, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIR, "assets")), name="assets")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
