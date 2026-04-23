"""Model Management API Routes"""
from fastapi import APIRouter
from models.model_manager import model_manager

router = APIRouter(prefix="/api/models", tags=["Models"])


@router.get("")
async def get_models():
    """Get all available models."""
    return {
        "models": model_manager.get_available_models(),
        "architectures": model_manager.get_architectures()
    }


@router.post("/{model_name}/activate")
async def activate_model(model_name: str):
    """Set the active model."""
    success = model_manager.activate_model(model_name)
    if success:
        return {"success": True, "active_model": model_name}
    return {"error": f"Failed to activate model: {model_name}"}


@router.get("/active")
async def get_active_model():
    """Get the currently active model."""
    return {
        "active_model": model_manager.active_model_name,
        "architecture": model_manager.active_architecture
    }
