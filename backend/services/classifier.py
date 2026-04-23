"""Classification Service for Stimme"""
import json
from datetime import datetime
from audio_processor import audio_processor
from models.model_manager import model_manager
from database import SessionLocal, ClassificationHistory


class ClassifierService:
    """Orchestrates audio classification."""

    def classify_audio(self, audio_bytes: bytes, source: str = "upload",
                       filename: str = "", top_k: int = 10) -> dict:
        """Classify audio from bytes."""
        # Load and preprocess audio
        waveform = audio_processor.load_audio(audio_bytes)

        if len(waveform) == 0:
            return {
                "predictions": [{"class": "Error", "confidence": 0, "model": "N/A"}],
                "audio_info": {"duration": 0, "sample_rate": 16000, "samples": 0,
                               "rms_level": 0, "peak_level": 0},
                "waveform": [],
                "spectrogram": {"data": [], "shape": [0, 0], "sample_rate": 16000, "n_mels": 128},
                "model_used": "none",
                "timestamp": datetime.utcnow().isoformat()
            }

        audio_info = audio_processor.get_audio_info(waveform)

        # Get visualization data
        waveform_data = audio_processor.get_waveform_data(waveform)
        spectrogram_data = audio_processor.get_spectrogram_data(waveform)

        # Only extract mel spectrogram for CNN models (not needed for YAMNet pretrained)
        mel_spec = None
        if model_manager.active_architecture not in ("yamnet",):
            trimmed = audio_processor.pad_or_trim(waveform)
            mel_spec = audio_processor.extract_mel_spectrogram(trimmed)

        # Classify — send FULL waveform for YAMNet (it handles variable length natively)
        predictions = model_manager.classify(
            waveform, spectrogram=mel_spec, top_k=top_k
        )

        # Save to history
        self._save_to_history(filename, source, predictions)

        return {
            "predictions": predictions,
            "audio_info": audio_info,
            "waveform": waveform_data,
            "spectrogram": spectrogram_data,
            "model_used": model_manager.active_model_name,
            "timestamp": datetime.utcnow().isoformat()
        }

    def _save_to_history(self, filename: str, source: str, predictions: list):
        """Save classification result to history."""
        db = None
        try:
            db = SessionLocal()
            top_pred = predictions[0] if predictions else {"class": "Unknown", "confidence": 0}
            entry = ClassificationHistory(
                filename=filename,
                source=source,
                predicted_class=top_pred["class"],
                confidence=top_pred["confidence"],
                model_used=model_manager.active_model_name,
                all_predictions_json=json.dumps(predictions[:5])
            )
            db.add(entry)
            db.commit()
        except Exception as e:
            print(f"[History] Failed to save: {e}")
        finally:
            if db:
                db.close()

    def get_history(self, limit: int = 50) -> list:
        """Get recent classification history."""
        db = None
        try:
            db = SessionLocal()
            entries = db.query(ClassificationHistory).order_by(
                ClassificationHistory.created_at.desc()
            ).limit(limit).all()
            results = []
            for e in entries:
                results.append({
                    "id": e.id,
                    "filename": e.filename,
                    "source": e.source,
                    "predicted_class": e.predicted_class,
                    "confidence": e.confidence,
                    "model_used": e.model_used,
                    "predictions": json.loads(e.all_predictions_json) if e.all_predictions_json else [],
                    "timestamp": e.created_at.isoformat() if e.created_at else ""
                })
            return results
        except Exception as e:
            print(f"[History] Failed to load: {e}")
            return []
        finally:
            if db:
                db.close()


# Global instance
classifier_service = ClassifierService()
