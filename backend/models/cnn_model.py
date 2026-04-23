"""Custom CNN Audio Classifier for Stimme"""
import os
import json
import numpy as np
import tensorflow as tf
from config import N_MELS, TRAINED_MODELS_DIR


class CNNClassifier:
    """CNN-based audio classifier operating on mel spectrograms."""

    def __init__(self):
        self.model = None
        self.class_names = []
        self.input_shape = None

    def build_model(self, num_classes: int, class_names: list,
                    input_shape: tuple = None):
        """Build CNN model for audio classification."""
        self.class_names = class_names
        self.input_shape = input_shape or (N_MELS, 94, 1)  # (mel_bands, time_steps, channels)

        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=self.input_shape),

            # Block 1
            tf.keras.layers.Conv2D(32, (3, 3), padding='same'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.MaxPooling2D((2, 2)),

            # Block 2
            tf.keras.layers.Conv2D(64, (3, 3), padding='same'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.MaxPooling2D((2, 2)),

            # Block 3
            tf.keras.layers.Conv2D(128, (3, 3), padding='same'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.MaxPooling2D((2, 2)),

            # Block 4
            tf.keras.layers.Conv2D(256, (3, 3), padding='same'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.ReLU(),
            tf.keras.layers.GlobalAveragePooling2D(),

            # Classifier head
            tf.keras.layers.Dense(256, activation='relu'),
            tf.keras.layers.Dropout(0.4),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(num_classes, activation='softmax')
        ])

        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        self.model = model
        return model

    def train(self, spectrograms: np.ndarray, labels: np.ndarray,
              epochs: int = 30, batch_size: int = 32,
              progress_callback=None) -> dict:
        """Train CNN on mel spectrograms."""
        if self.model is None:
            raise ValueError("Model not built yet")

        # Add channel dimension if needed
        if len(spectrograms.shape) == 3:
            spectrograms = np.expand_dims(spectrograms, axis=-1)

        # One-hot encode
        num_classes = len(self.class_names)
        labels_onehot = tf.keras.utils.to_categorical(labels, num_classes)

        # Split
        split = int(0.8 * len(spectrograms))
        indices = np.random.permutation(len(spectrograms))
        train_idx, val_idx = indices[:split], indices[split:]

        X_train, y_train = spectrograms[train_idx], labels_onehot[train_idx]
        X_val, y_val = spectrograms[val_idx], labels_onehot[val_idx]

        class ProgressCallback(tf.keras.callbacks.Callback):
            def on_epoch_end(self, epoch, logs=None):
                if progress_callback:
                    progress_callback(epoch + 1, epochs, logs)

        history = self.model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[
                ProgressCallback(),
                tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True)
            ],
            verbose=0
        )

        final_acc = history.history['accuracy'][-1]
        val_acc = history.history.get('val_accuracy', [0])[-1]
        return {
            "accuracy": round(float(final_acc), 4),
            "val_accuracy": round(float(val_acc), 4),
            "epochs_trained": len(history.history['accuracy'])
        }

    def predict(self, spectrogram: np.ndarray, top_k: int = 5) -> list:
        """Predict class from mel spectrogram."""
        if self.model is None:
            return []

        if len(spectrogram.shape) == 2:
            spectrogram = np.expand_dims(spectrogram, axis=(0, -1))
        elif len(spectrogram.shape) == 3:
            spectrogram = np.expand_dims(spectrogram, axis=0)

        predictions = self.model.predict(spectrogram, verbose=0)[0]
        top_indices = np.argsort(predictions)[::-1][:top_k]

        results = []
        for idx in top_indices:
            results.append({
                "class": self.class_names[idx],
                "confidence": round(float(predictions[idx]), 4),
                "model": "Custom CNN"
            })
        return results

    def save_model(self, model_name: str) -> str:
        """Save model to disk."""
        if self.model is None:
            raise ValueError("No model to save")

        model_dir = os.path.join(TRAINED_MODELS_DIR, model_name)
        os.makedirs(model_dir, exist_ok=True)

        model_path = os.path.join(model_dir, "model.keras")
        self.model.save(model_path)

        meta = {
            "class_names": self.class_names,
            "architecture": "custom_cnn",
            "input_shape": list(self.input_shape) if self.input_shape else None
        }
        with open(os.path.join(model_dir, "meta.json"), "w") as f:
            json.dump(meta, f)

        return model_path

    def load_model(self, model_name: str) -> bool:
        """Load a previously saved model."""
        model_dir = os.path.join(TRAINED_MODELS_DIR, model_name)
        model_path = os.path.join(model_dir, "model.keras")
        meta_path = os.path.join(model_dir, "meta.json")

        if not os.path.exists(model_path) or not os.path.exists(meta_path):
            return False

        self.model = tf.keras.models.load_model(model_path)
        with open(meta_path) as f:
            meta = json.load(f)
        self.class_names = meta["class_names"]
        self.input_shape = tuple(meta.get("input_shape", [N_MELS, 94, 1]))
        return True
