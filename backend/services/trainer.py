"""Training Service for Stimme"""
import os
import json
import numpy as np
from datetime import datetime
from audio_processor import audio_processor
from models.yamnet_model import yamnet_classifier
from models.cnn_model import CNNClassifier
from models.model_manager import model_manager
from database import SessionLocal, SoundClass, AudioSample, TrainedModel
from config import AUDIO_SAMPLES_DIR, TRAINED_MODELS_DIR


class TrainerService:
    """Handles model training pipeline."""

    def __init__(self):
        self.training_status = {
            "is_training": False,
            "progress": 0,
            "current_epoch": 0,
            "total_epochs": 0,
            "accuracy": 0,
            "val_accuracy": 0,
            "message": "Idle",
            "model_name": ""
        }

    def get_status(self) -> dict:
        return self.training_status.copy()

    def train_model(self, class_ids: list, architecture: str = "yamnet_transfer",
                    model_name: str = None, epochs: int = 30) -> dict:
        """Train a model on selected classes."""
        if self.training_status["is_training"]:
            return {"error": "Training already in progress"}

        self.training_status["is_training"] = True
        self.training_status["message"] = "Preparing training data..."
        self.training_status["progress"] = 5

        try:
            # Gather training data
            db = SessionLocal()
            classes = db.query(SoundClass).filter(SoundClass.id.in_(class_ids)).all()
            if not classes:
                db.close()
                self.training_status["is_training"] = False
                return {"error": "No classes found"}

            class_names = [c.name for c in classes]
            if not model_name:
                model_name = f"stimme_{architecture}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

            self.training_status["model_name"] = model_name
            self.training_status["message"] = "Loading audio samples..."
            self.training_status["progress"] = 10

            # Load and process audio samples
            all_embeddings = []  # For YAMNet transfer
            all_spectrograms = []  # For CNN
            all_labels = []

            for class_idx, sound_class in enumerate(classes):
                samples = db.query(AudioSample).filter(
                    AudioSample.class_id == sound_class.id
                ).all()

                class_dir = os.path.join(AUDIO_SAMPLES_DIR, str(sound_class.id))
                for sample in samples:
                    filepath = os.path.join(class_dir, sample.filename)
                    if not os.path.exists(filepath):
                        continue

                    try:
                        with open(filepath, 'rb') as f:
                            audio_bytes = f.read()
                        waveform = audio_processor.load_audio(audio_bytes)

                        # Augment
                        augmented_waveforms = audio_processor.augment_audio(waveform)

                        for aug_waveform in augmented_waveforms:
                            aug_waveform = audio_processor.pad_or_trim(aug_waveform)

                            if architecture == "yamnet_transfer":
                                embedding = yamnet_classifier.extract_embeddings(aug_waveform)
                                all_embeddings.append(embedding)
                            else:
                                mel_spec = audio_processor.extract_mel_spectrogram(aug_waveform)
                                all_spectrograms.append(mel_spec)

                            all_labels.append(class_idx)
                    except Exception as e:
                        print(f"[Trainer] Error processing {filepath}: {e}")
                        continue

            db.close()

            if len(all_labels) < 10:
                self.training_status["is_training"] = False
                return {"error": f"Not enough samples. Found {len(all_labels)}, need at least 10."}

            self.training_status["message"] = "Training model..."
            self.training_status["progress"] = 30
            self.training_status["total_epochs"] = epochs

            def progress_callback(epoch, total, logs):
                self.training_status["current_epoch"] = epoch
                self.training_status["total_epochs"] = total
                self.training_status["accuracy"] = logs.get('accuracy', 0)
                self.training_status["val_accuracy"] = logs.get('val_accuracy', 0)
                self.training_status["progress"] = 30 + int(60 * epoch / total)

            # Train based on architecture
            if architecture == "yamnet_transfer":
                embeddings_array = np.array(all_embeddings)
                labels_array = np.array(all_labels)

                yamnet_classifier.build_custom_classifier(len(class_names), class_names)
                result = yamnet_classifier.train_custom(
                    embeddings_array, labels_array,
                    epochs=epochs, progress_callback=progress_callback
                )
                # Save model
                model_path = yamnet_classifier.save_custom_model(model_name)

            elif architecture == "custom_cnn":
                spectrograms_array = np.array(all_spectrograms)
                labels_array = np.array(all_labels)

                cnn = CNNClassifier()
                input_shape = spectrograms_array.shape[1:] + (1,)
                cnn.build_model(len(class_names), class_names, input_shape)
                result = cnn.train(
                    spectrograms_array, labels_array,
                    epochs=epochs, progress_callback=progress_callback
                )
                model_path = cnn.save_model(model_name)
                model_manager.register_trained_model(model_name, architecture, class_names, cnn)
            else:
                self.training_status["is_training"] = False
                return {"error": f"Unknown architecture: {architecture}"}

            # Register model
            if architecture == "yamnet_transfer":
                model_manager.register_trained_model(
                    model_name, architecture, class_names, yamnet_classifier
                )

            # Save to database
            db = SessionLocal()
            trained_model = TrainedModel(
                name=model_name,
                architecture=architecture,
                description=f"Trained on {len(class_names)} classes with {len(all_labels)} samples",
                classes_json=json.dumps(class_names),
                num_classes=len(class_names),
                accuracy=result.get("accuracy", 0),
                file_path=model_path if isinstance(model_path, str) else "",
                is_active=False
            )
            db.add(trained_model)
            db.commit()
            db.close()

            self.training_status["progress"] = 100
            self.training_status["message"] = "Training complete!"
            self.training_status["is_training"] = False

            return {
                "success": True,
                "model_name": model_name,
                "accuracy": result.get("accuracy", 0),
                "val_accuracy": result.get("val_accuracy", 0),
                "epochs_trained": result.get("epochs_trained", 0),
                "total_samples": len(all_labels),
                "classes": class_names
            }

        except Exception as e:
            self.training_status["is_training"] = False
            self.training_status["message"] = f"Error: {str(e)}"
            return {"error": str(e)}


# Global instance
trainer_service = TrainerService()
