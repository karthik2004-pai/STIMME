"""Training API Routes"""
from fastapi import APIRouter, Form
from typing import Optional
from services.trainer import trainer_service

router = APIRouter(prefix="/api/training", tags=["Training"])


@router.post("/start")
async def start_training(
    class_ids: str = Form(...),  # comma-separated class IDs
    architecture: str = Form("yamnet_transfer"),
    model_name: Optional[str] = Form(None),
    epochs: int = Form(30)
):
    """Start model training."""
    ids = [int(x.strip()) for x in class_ids.split(",") if x.strip()]
    result = trainer_service.train_model(
        class_ids=ids,
        architecture=architecture,
        model_name=model_name,
        epochs=epochs
    )
    return result


@router.get("/status")
async def get_training_status():
    """Get current training status."""
    return trainer_service.get_status()
