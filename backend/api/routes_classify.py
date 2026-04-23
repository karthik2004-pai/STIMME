"""Classification API Routes"""
from fastapi import APIRouter, UploadFile, File
from services.classifier import classifier_service

router = APIRouter(prefix="/api/classify", tags=["Classification"])


@router.post("/upload")
async def classify_upload(file: UploadFile = File(...)):
    """Classify an uploaded audio file."""
    audio_bytes = await file.read()
    result = classifier_service.classify_audio(
        audio_bytes, source="upload", filename=file.filename or ""
    )
    return result


@router.post("/record")
async def classify_recording(file: UploadFile = File(...)):
    """Classify a recorded audio blob from microphone."""
    audio_bytes = await file.read()
    result = classifier_service.classify_audio(
        audio_bytes, source="record", filename="microphone_recording"
    )
    return result


@router.get("/history")
async def get_history(limit: int = 50):
    """Get classification history."""
    return classifier_service.get_history(limit=limit)
