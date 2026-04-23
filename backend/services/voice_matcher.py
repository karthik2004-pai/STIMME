"""Voice Matching / Speaker Verification Service
Enrolls voice profiles and verifies if a new audio matches a known speaker.
Uses MFCC-based cosine similarity for speaker embedding comparison.
"""
import os
import json
import numpy as np
import librosa
from audio_processor import audio_processor
from config import DATA_DIR, SAMPLE_RATE, N_MFCC

VOICE_PROFILES_DIR = os.path.join(DATA_DIR, "voice_profiles")
os.makedirs(VOICE_PROFILES_DIR, exist_ok=True)


class VoiceMatcher:
    """Speaker verification using MFCC-based voice embeddings."""

    def __init__(self):
        self.profiles = {}  # name -> embedding
        self._load_profiles()

    def _load_profiles(self):
        """Load saved voice profiles from disk."""
        for f in os.listdir(VOICE_PROFILES_DIR):
            if f.endswith('.json'):
                try:
                    path = os.path.join(VOICE_PROFILES_DIR, f)
                    with open(path) as fp:
                        data = json.load(fp)
                    self.profiles[data["name"]] = {
                        "embedding": np.array(data["embedding"]),
                        "enrolled_at": data.get("enrolled_at", ""),
                        "num_samples": data.get("num_samples", 1),
                    }
                    print(f"[VoiceMatcher] Loaded profile: {data['name']}")
                except Exception as e:
                    print(f"[VoiceMatcher] Failed to load {f}: {e}")

    def extract_voice_embedding(self, audio_bytes: bytes) -> np.ndarray:
        """Extract a voice embedding (speaker signature) from audio."""
        waveform = audio_processor.load_audio(audio_bytes)
        sr = audio_processor.sr

        if len(waveform) < sr * 0.3:
            raise ValueError("Audio too short — need at least 0.3 seconds")

        # Extract MFCCs
        mfccs = librosa.feature.mfcc(
            y=waveform, sr=sr, n_mfcc=N_MFCC,
            n_fft=2048, hop_length=512
        )
        # Delta and delta-delta MFCCs for richer representation
        delta_mfccs = librosa.feature.delta(mfccs)
        delta2_mfccs = librosa.feature.delta(mfccs, order=2)

        # Spectral features
        spectral_centroid = librosa.feature.spectral_centroid(y=waveform, sr=sr)
        spectral_rolloff = librosa.feature.spectral_rolloff(y=waveform, sr=sr)
        zcr = librosa.feature.zero_crossing_rate(waveform)

        # Build embedding: mean and std of all features
        embedding = np.concatenate([
            np.mean(mfccs, axis=1),
            np.std(mfccs, axis=1),
            np.mean(delta_mfccs, axis=1),
            np.std(delta_mfccs, axis=1),
            np.mean(delta2_mfccs, axis=1),
            [np.mean(spectral_centroid), np.std(spectral_centroid)],
            [np.mean(spectral_rolloff), np.std(spectral_rolloff)],
            [np.mean(zcr), np.std(zcr)],
        ])

        return embedding

    def enroll(self, name: str, audio_bytes: bytes) -> dict:
        """Enroll a new voice profile or update existing."""
        try:
            embedding = self.extract_voice_embedding(audio_bytes)
        except ValueError as e:
            return {"success": False, "error": str(e)}

        from datetime import datetime

        # If profile exists, average with existing (improves accuracy)
        if name in self.profiles:
            old_emb = self.profiles[name]["embedding"]
            n = self.profiles[name]["num_samples"]
            # Weighted running average
            new_emb = (old_emb * n + embedding) / (n + 1)
            self.profiles[name]["embedding"] = new_emb
            self.profiles[name]["num_samples"] = n + 1
        else:
            self.profiles[name] = {
                "embedding": embedding,
                "enrolled_at": datetime.utcnow().isoformat(),
                "num_samples": 1,
            }

        # Save to disk
        self._save_profile(name)

        return {
            "success": True,
            "name": name,
            "num_samples": self.profiles[name]["num_samples"],
            "message": f"Voice profile '{name}' enrolled successfully"
        }

    def verify(self, audio_bytes: bytes) -> dict:
        """Verify audio against all enrolled voice profiles."""
        if not self.profiles:
            return {
                "match_found": False,
                "message": "No voice profiles enrolled. Enroll a voice first.",
                "results": [],
            }

        try:
            query_embedding = self.extract_voice_embedding(audio_bytes)
        except ValueError as e:
            return {"match_found": False, "error": str(e), "results": []}

        results = []
        for name, profile in self.profiles.items():
            ref_emb = profile["embedding"]
            similarity = self._cosine_similarity(query_embedding, ref_emb)
            # Convert to percentage (0-100)
            match_pct = max(0, min(100, round(similarity * 100, 1)))

            results.append({
                "name": name,
                "similarity": round(similarity, 4),
                "match_percentage": match_pct,
                "is_match": match_pct > 70,
                "enrolled_at": profile.get("enrolled_at", ""),
                "num_samples": profile.get("num_samples", 1),
            })

        # Sort by similarity descending
        results.sort(key=lambda x: x["similarity"], reverse=True)

        best = results[0] if results else None
        match_found = best and best["is_match"]

        return {
            "match_found": match_found,
            "best_match": best,
            "results": results,
            "message": f"Best match: {best['name']} ({best['match_percentage']}%)" if best else "No matches",
        }

    def get_profiles(self) -> list:
        """List all enrolled voice profiles."""
        return [
            {
                "name": name,
                "enrolled_at": info.get("enrolled_at", ""),
                "num_samples": info.get("num_samples", 1),
            }
            for name, info in self.profiles.items()
        ]

    def delete_profile(self, name: str) -> bool:
        """Delete a voice profile."""
        if name in self.profiles:
            del self.profiles[name]
            path = os.path.join(VOICE_PROFILES_DIR, f"{name}.json")
            if os.path.exists(path):
                os.remove(path)
            return True
        return False

    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two embeddings."""
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    def _save_profile(self, name: str):
        """Save a voice profile to disk."""
        profile = self.profiles[name]
        path = os.path.join(VOICE_PROFILES_DIR, f"{name}.json")
        with open(path, 'w') as f:
            json.dump({
                "name": name,
                "embedding": profile["embedding"].tolist(),
                "enrolled_at": profile.get("enrolled_at", ""),
                "num_samples": profile.get("num_samples", 1),
            }, f)


# Global instance
voice_matcher = VoiceMatcher()
