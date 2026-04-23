"""Model Manager for Stimme - Handles model registration, loading, and switching."""
import os
import json
from typing import Optional
from models.yamnet_model import YAMNetClassifier, yamnet_classifier
from models.cnn_model import CNNClassifier
from config import TRAINED_MODELS_DIR


class ModelManager:
    """Manages all available models and the active classifier."""

    def __init__(self):
        self.yamnet = yamnet_classifier
        self.custom_models = {}  # name -> classifier instance
        self.active_model_name = "yamnet_pretrained"
        self.active_architecture = "yamnet"
        self._loading_yamnet = False

    def initialize(self):
        """Initialize the model manager and load YAMNet."""
        try:
            self.yamnet.load()
            print("[ModelManager] YAMNet initialized")
        except Exception as e:
            print(f"[ModelManager] YAMNet init failed: {e}")

        # Load any previously saved custom models
        self._load_saved_models()

    def _load_saved_models(self):
        """Scan trained_models directory and register saved models."""
        if not os.path.exists(TRAINED_MODELS_DIR):
            return
        for model_name in os.listdir(TRAINED_MODELS_DIR):
            meta_path = os.path.join(TRAINED_MODELS_DIR, model_name, "meta.json")
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    meta = json.load(f)
                arch = meta.get("architecture", "unknown")
                self.custom_models[model_name] = {
                    "architecture": arch,
                    "class_names": meta.get("class_names", []),
                    "loaded": False,
                    "instance": None
                }
                print(f"[ModelManager] Found saved model: {model_name} ({arch})")

    def get_available_models(self) -> list:
        """List all available models."""
        models = [{
            "name": "yamnet_pretrained",
            "architecture": "YAMNet",
            "description": "Google's pre-trained audio classifier (521 classes)",
            "classes": len(self.yamnet.class_names_yamnet),
            "is_active": self.active_model_name == "yamnet_pretrained",
            "status": "loaded" if self.yamnet.is_loaded else "not_loaded"
        }]

        for name, info in self.custom_models.items():
            models.append({
                "name": name,
                "architecture": info["architecture"],
                "description": f"Custom {info['architecture']} model",
                "classes": len(info["class_names"]),
                "class_names": info["class_names"],
                "is_active": self.active_model_name == name,
                "status": "loaded" if info["loaded"] else "saved"
            })

        return models

    def get_architectures(self) -> list:
        """List available model architectures."""
        return [
            {
                "id": "yamnet_transfer",
                "name": "YAMNet Transfer Learning",
                "description": "Uses Google's YAMNet embeddings with a custom classifier head. Fast training, good accuracy.",
                "recommended": True,
                "training_time": "~1-2 minutes",
                "min_samples": 10
            },
            {
                "id": "custom_cnn",
                "name": "Custom CNN",
                "description": "Conv2D network on mel spectrograms. Trains from scratch, needs more data.",
                "recommended": False,
                "training_time": "~5-10 minutes",
                "min_samples": 50
            }
        ]

    def activate_model(self, model_name: str) -> bool:
        """Set the active model for classification."""
        if model_name == "yamnet_pretrained":
            if not self.yamnet.is_loaded:
                self.yamnet.load()
            self.active_model_name = model_name
            self.active_architecture = "yamnet"
            return True

        if model_name in self.custom_models:
            info = self.custom_models[model_name]
            if not info["loaded"]:
                success = self._load_custom_model(model_name, info["architecture"])
                if not success:
                    return False
            self.active_model_name = model_name
            self.active_architecture = info["architecture"]
            return True

        return False

    def _load_custom_model(self, model_name: str, architecture: str) -> bool:
        """Load a custom model from disk."""
        if architecture == "yamnet_transfer":
            success = self.yamnet.load_custom_model(model_name)
            if success:
                self.custom_models[model_name]["loaded"] = True
                self.custom_models[model_name]["instance"] = self.yamnet
                return True
        elif architecture == "custom_cnn":
            cnn = CNNClassifier()
            success = cnn.load_model(model_name)
            if success:
                self.custom_models[model_name]["loaded"] = True
                self.custom_models[model_name]["instance"] = cnn
                return True
        return False

    def classify(self, waveform, spectrogram=None, top_k: int = 10) -> list:
        """Classify audio using the active model."""
        import numpy as np
        if waveform is None or len(waveform) == 0:
            return [{"class": "Silence / No Audio", "confidence": 0.0, "model": "N/A"}]

        # Only flag as silence if the audio is truly empty (near-zero RMS)
        rms = float(np.sqrt(np.mean(waveform ** 2)))
        peak = float(np.max(np.abs(waveform)))
        if peak < 1e-6 and rms < 1e-7:
            return [{"class": "Silence / No Audio", "confidence": 0.0, "model": "N/A"}]

        if self.active_model_name == "yamnet_pretrained":
            return self.yamnet.predict_yamnet(waveform, top_k=top_k)

        if self.active_model_name in self.custom_models:
            info = self.custom_models[self.active_model_name]
            if not info["loaded"]:
                self._load_custom_model(self.active_model_name, info["architecture"])

            if info["architecture"] == "yamnet_transfer":
                return self.yamnet.predict_custom(waveform, top_k=top_k)
            elif info["architecture"] == "custom_cnn" and info.get("instance"):
                if spectrogram is not None:
                    return info["instance"].predict(spectrogram, top_k=top_k)

        # Fallback to YAMNet pretrained
        return self.yamnet.predict_yamnet(waveform, top_k=top_k)

    def register_trained_model(self, model_name: str, architecture: str,
                                class_names: list, instance=None):
        """Register a newly trained model."""
        self.custom_models[model_name] = {
            "architecture": architecture,
            "class_names": class_names,
            "loaded": instance is not None,
            "instance": instance
        }


# Global instance
model_manager = ModelManager()
