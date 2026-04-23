"""YAMNet-based Audio Classifier for Stimme"""
import os
import json
import numpy as np
import tensorflow as tf
import tensorflow_hub as hub
from config import YAMNET_MODEL_URL, EMBEDDING_DIM, TRAINED_MODELS_DIR, SAMPLE_RATE


class YAMNetClassifier:
    """YAMNet-based audio classifier with transfer learning support."""

    def __init__(self):
        self.yamnet_model = None
        self.class_names_yamnet = []
        self.custom_model = None
        self.custom_class_names = []
        self.is_loaded = False

    def load(self):
        """Load YAMNet model from TF Hub."""
        if self.is_loaded:
            return
        try:
            self.yamnet_model = hub.load(YAMNET_MODEL_URL)
            # Load YAMNet class names
            class_map_path = self.yamnet_model.class_map_path().numpy().decode('utf-8')
            with tf.io.gfile.GFile(class_map_path) as f:
                lines = f.read().strip().split('\n')
                self.class_names_yamnet = [line.split(',', 2)[-1].strip('"') for line in lines[1:]]
            self.is_loaded = True
            print(f"[YAMNet] Loaded with {len(self.class_names_yamnet)} classes")
        except Exception as e:
            print(f"[YAMNet] Failed to load: {e}")
            self.is_loaded = False

    def predict_yamnet(self, waveform: np.ndarray, top_k: int = 10) -> list:
        """Classify audio using pre-trained YAMNet (521 classes)."""
        if not self.is_loaded:
            self.load()
        if not self.is_loaded:
            return [{"class": "Error", "confidence": 0, "description": "YAMNet not loaded"}]

        waveform = waveform.astype(np.float32)
        scores, embeddings, spectrogram = self.yamnet_model(waveform)
        scores_np = scores.numpy()
        mean_scores = np.mean(scores_np, axis=0)
        top_indices = np.argsort(mean_scores)[::-1][:top_k]

        predictions = []
        for idx in top_indices:
            predictions.append({
                "class": self.class_names_yamnet[idx],
                "confidence": round(float(mean_scores[idx]), 4),
                "model": "YAMNet (Pre-trained)"
            })
        return predictions

    def extract_embeddings(self, waveform: np.ndarray) -> np.ndarray:
        """Extract YAMNet embeddings for transfer learning."""
        if not self.is_loaded:
            self.load()
        waveform = waveform.astype(np.float32)
        scores, embeddings, spectrogram = self.yamnet_model(waveform)
        # Average embeddings over time
        mean_embedding = np.mean(embeddings.numpy(), axis=0)
        return mean_embedding

    def build_custom_classifier(self, num_classes: int, class_names: list):
        """Build a small classifier head on top of YAMNet embeddings."""
        self.custom_class_names = class_names
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(EMBEDDING_DIM,)),
            tf.keras.layers.Dense(256, activation='relu'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.Dense(num_classes, activation='softmax')
        ])
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        self.custom_model = model
        return model

    def train_custom(self, embeddings: np.ndarray, labels: np.ndarray,
                     epochs: int = 30, batch_size: int = 32,
                     progress_callback=None) -> dict:
        """Train the custom classifier head."""
        if self.custom_model is None:
            raise ValueError("Custom classifier not built yet")

        # One-hot encode labels
        num_classes = len(self.custom_class_names)
        labels_onehot = tf.keras.utils.to_categorical(labels, num_classes)

        # Split into train/val
        split = int(0.8 * len(embeddings))
        indices = np.random.permutation(len(embeddings))
        train_idx, val_idx = indices[:split], indices[split:]

        X_train, y_train = embeddings[train_idx], labels_onehot[train_idx]
        X_val, y_val = embeddings[val_idx], labels_onehot[val_idx]

        class ProgressCallback(tf.keras.callbacks.Callback):
            def on_epoch_end(self, epoch, logs=None):
                if progress_callback:
                    progress_callback(epoch + 1, epochs, logs)

        history = self.custom_model.fit(
            X_train, y_train,
            validation_data=(X_val, y_val),
            epochs=epochs,
            batch_size=batch_size,
            callbacks=[ProgressCallback()],
            verbose=0
        )

        final_acc = history.history['accuracy'][-1]
        val_acc = history.history.get('val_accuracy', [0])[-1]
        return {
            "accuracy": round(float(final_acc), 4),
            "val_accuracy": round(float(val_acc), 4),
            "epochs_trained": epochs
        }

    def predict_custom(self, waveform: np.ndarray, top_k: int = 5) -> list:
        """Classify using custom trained model."""
        if self.custom_model is None:
            return []

        embedding = self.extract_embeddings(waveform)
        embedding = np.expand_dims(embedding, axis=0)
        predictions = self.custom_model.predict(embedding, verbose=0)[0]
        top_indices = np.argsort(predictions)[::-1][:top_k]

        results = []
        for idx in top_indices:
            results.append({
                "class": self.custom_class_names[idx],
                "confidence": round(float(predictions[idx]), 4),
                "model": "YAMNet (Custom)"
            })
        return results

    def save_custom_model(self, model_name: str) -> str:
        """Save custom model to disk."""
        if self.custom_model is None:
            raise ValueError("No custom model to save")

        model_dir = os.path.join(TRAINED_MODELS_DIR, model_name)
        os.makedirs(model_dir, exist_ok=True)

        model_path = os.path.join(model_dir, "model.keras")
        self.custom_model.save(model_path)

        meta = {
            "class_names": self.custom_class_names,
            "architecture": "yamnet_transfer",
            "embedding_dim": EMBEDDING_DIM
        }
        with open(os.path.join(model_dir, "meta.json"), "w") as f:
            json.dump(meta, f)

        return model_path

    def load_custom_model(self, model_name: str) -> bool:
        """Load a previously saved custom model."""
        model_dir = os.path.join(TRAINED_MODELS_DIR, model_name)
        model_path = os.path.join(model_dir, "model.keras")
        meta_path = os.path.join(model_dir, "meta.json")

        if not os.path.exists(model_path) or not os.path.exists(meta_path):
            return False

        self.custom_model = tf.keras.models.load_model(model_path)
        with open(meta_path) as f:
            meta = json.load(f)
        self.custom_class_names = meta["class_names"]
        return True


# Global instance
yamnet_classifier = YAMNetClassifier()
