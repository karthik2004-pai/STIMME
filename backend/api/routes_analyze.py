"""Frequency Analysis API Routes"""
from fastapi import APIRouter, UploadFile, File
from audio_processor import audio_processor

router = APIRouter(prefix="/api/analyze", tags=["Analysis"])


@router.post("/upload")
async def analyze_upload(file: UploadFile = File(...)):
    """Analyze frequency content of an uploaded audio file."""
    audio_bytes = await file.read()
    waveform = audio_processor.load_audio(audio_bytes)

    # Get all analysis data
    audio_info = audio_processor.get_audio_info(waveform)
    frequency_data = audio_processor.get_frequency_analysis(waveform)
    spectrogram_data = audio_processor.get_spectrogram_data(waveform)
    waveform_vis = audio_processor.get_waveform_data(waveform, 800)

    return {
        "audio_info": audio_info,
        "frequency_analysis": frequency_data,
        "spectrogram": spectrogram_data,
        "waveform": waveform_vis,
        "filename": file.filename or "",
    }
