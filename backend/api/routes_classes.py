"""Class Management API Routes"""
from fastapi import APIRouter, UploadFile, File, Form
from typing import Optional
from services.class_manager import class_manager

router = APIRouter(prefix="/api/classes", tags=["Classes"])


@router.get("")
async def get_classes():
    """Get all sound classes."""
    return {
        "classes": class_manager.get_all_classes(),
        "categories": class_manager.get_categories()
    }


@router.post("")
async def create_class(
    name: str = Form(...),
    category: str = Form(...),
    description: str = Form(""),
    icon: str = Form("")
):
    """Create a new sound class."""
    return class_manager.create_class(name, category, description, icon)


@router.delete("/{class_id}")
async def delete_class(class_id: int):
    """Delete a sound class."""
    return class_manager.delete_class(class_id)


@router.post("/{class_id}/samples")
async def upload_samples(class_id: int, files: list[UploadFile] = File(...)):
    """Upload audio samples to a class."""
    results = []
    for file in files:
        audio_bytes = await file.read()
        result = class_manager.add_sample(class_id, audio_bytes, file.filename or "")
        results.append(result)
    return {"uploaded": results}


@router.get("/{class_id}/samples")
async def get_samples(class_id: int):
    """Get all samples for a class."""
    return {"samples": class_manager.get_samples(class_id)}


@router.delete("/samples/{sample_id}")
async def delete_sample(sample_id: int):
    """Delete a sample."""
    return class_manager.delete_sample(sample_id)
