"""Intelligence Analysis API Routes
Audio forensics, speaker diarization, steganography, threats, enhancement.
"""
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
from services.forensics_analyzer import forensics_analyzer
from services.speaker_analyzer import speaker_analyzer
from services.steganalysis import steg_analyzer
from services.threat_detector import threat_detector
from services.audio_enhancer import audio_enhancer

router = APIRouter(prefix="/api/intel", tags=["Intelligence"])


@router.post("/forensics")
async def forensics_analysis(file: UploadFile = File(...)):
    """Analyze audio for signs of tampering, splicing, or AI generation."""
    audio_bytes = await file.read()
    try:
        result = forensics_analyzer.analyze(audio_bytes)
        return result
    except Exception as e:
        return JSONResponse(status_code=500,
                            content={"error": f"Forensics analysis failed: {str(e)}"})


@router.post("/speakers")
async def speaker_diarization(file: UploadFile = File(...)):
    """Identify speakers and create 'who spoke when' timeline."""
    audio_bytes = await file.read()
    try:
        result = speaker_analyzer.analyze(audio_bytes)
        return result
    except Exception as e:
        return JSONResponse(status_code=500,
                            content={"error": f"Speaker analysis failed: {str(e)}"})


@router.post("/steganalysis")
async def steganography_detection(file: UploadFile = File(...)):
    """Detect hidden data or messages embedded in audio."""
    audio_bytes = await file.read()
    try:
        result = steg_analyzer.analyze(audio_bytes)
        return result
    except Exception as e:
        return JSONResponse(status_code=500,
                            content={"error": f"Steganalysis failed: {str(e)}"})


@router.post("/threats")
async def threat_detection(file: UploadFile = File(...)):
    """Detect acoustic threats (gunshots, explosions, screams, alarms)."""
    audio_bytes = await file.read()
    try:
        result = threat_detector.analyze(audio_bytes)
        return result
    except Exception as e:
        return JSONResponse(status_code=500,
                            content={"error": f"Threat detection failed: {str(e)}"})


@router.post("/enhance")
async def audio_enhancement(file: UploadFile = File(...)):
    """Enhance audio by removing noise and isolating voice."""
    audio_bytes = await file.read()
    try:
        result = audio_enhancer.enhance(audio_bytes)
        return result
    except Exception as e:
        return JSONResponse(status_code=500,
                            content={"error": f"Enhancement failed: {str(e)}"})
