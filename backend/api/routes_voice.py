"""Voice Matching API Routes — Speaker Verification & Identification"""
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from services.voice_matcher import voice_matcher

router = APIRouter(prefix="/api/voice", tags=["Voice Matching"])


@router.post("/enroll")
async def enroll_voice(file: UploadFile = File(...), name: str = Form(...)):
    """Enroll a voice profile for a person."""
    audio_bytes = await file.read()
    try:
        result = voice_matcher.enroll(name, audio_bytes)
        return result
    except Exception as e:
        return JSONResponse(status_code=500,
                            content={"error": f"Enrollment failed: {str(e)}"})


@router.post("/verify")
async def verify_voice(file: UploadFile = File(...)):
    """Verify an audio sample against all enrolled voice profiles."""
    audio_bytes = await file.read()
    try:
        result = voice_matcher.verify(audio_bytes)
        return result
    except Exception as e:
        return JSONResponse(status_code=500,
                            content={"error": f"Verification failed: {str(e)}"})


@router.get("/profiles")
async def get_profiles():
    """List all enrolled voice profiles."""
    return {"profiles": voice_matcher.get_profiles()}


@router.delete("/profiles/{name}")
async def delete_profile(name: str):
    """Delete a voice profile."""
    if voice_matcher.delete_profile(name):
        return {"success": True, "message": f"Profile '{name}' deleted"}
    return JSONResponse(status_code=404,
                        content={"error": f"Profile '{name}' not found"})
