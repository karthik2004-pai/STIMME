"""Acoustic Threat Detection — Gunshot, Explosion, & Danger Detection
Used by: DARPA ShotSpotter, US Law Enforcement, Military SIGINT.
Detects impulsive sounds like gunshots, explosions, breaking glass, screams.
"""
import numpy as np
import librosa
from audio_processor import audio_processor
from config import SAMPLE_RATE, N_FFT, HOP_LENGTH, N_MELS


class ThreatDetector:
    """Detects acoustic threat events in audio."""

    # Threat sound spectral profiles (frequency bands and characteristics)
    THREAT_PROFILES = {
        "gunshot": {
            "icon": "🔫",
            "min_duration": 0.01,
            "max_duration": 0.3,
            "peak_freq_range": (800, 5000),
            "sharpness": 0.8,
            "severity": "critical",
        },
        "explosion": {
            "icon": "💥",
            "min_duration": 0.1,
            "max_duration": 2.0,
            "peak_freq_range": (20, 500),
            "sharpness": 0.6,
            "severity": "critical",
        },
        "glass_breaking": {
            "icon": "🪟",
            "min_duration": 0.05,
            "max_duration": 1.5,
            "peak_freq_range": (3000, 12000),
            "sharpness": 0.7,
            "severity": "high",
        },
        "scream": {
            "icon": "😱",
            "min_duration": 0.3,
            "max_duration": 5.0,
            "peak_freq_range": (1000, 4000),
            "sharpness": 0.3,
            "severity": "high",
        },
        "alarm_siren": {
            "icon": "🚨",
            "min_duration": 0.5,
            "max_duration": 30.0,
            "peak_freq_range": (500, 3000),
            "sharpness": 0.2,
            "severity": "medium",
        },
    }

    def analyze(self, audio_bytes: bytes) -> dict:
        """Detect and classify threat events in audio."""
        waveform = audio_processor.load_audio(audio_bytes)
        sr = audio_processor.sr
        duration = len(waveform) / sr

        if len(waveform) < sr * 0.1:
            return {
                "overall_threat": "CLEAR",
                "threat_level": "CLEAR",
                "total_events": 0,
                "duration": round(duration, 2),
                "events": [],
                "event_summary": {},
            }

        try:
            # Step 1: Detect onset events (transients)
            onsets = self._detect_onsets(waveform, sr)

            # Step 2: Analyze each onset event
            events = []
            for onset in onsets:
                try:
                    event = self._classify_event(waveform, sr, onset)
                    if event:
                        events.append(event)
                except Exception:
                    pass

            # Step 3: Continuous threat analysis
            try:
                continuous_threats = self._detect_continuous_threats(waveform, sr)
                events.extend(continuous_threats)
            except Exception:
                pass

            # Sort by time
            events.sort(key=lambda x: x["time"])

            # Overall threat level
            if any(e["severity"] == "critical" for e in events):
                overall_threat = "CRITICAL"
            elif any(e["severity"] == "high" for e in events):
                overall_threat = "HIGH"
            elif events:
                overall_threat = "MEDIUM"
            else:
                overall_threat = "CLEAR"

            return {
                "overall_threat": overall_threat,
                "threat_level": overall_threat,
                "total_events": len(events),
                "duration": round(duration, 2),
                "events": events,
                "event_summary": self._summarize_events(events),
            }
        except Exception as e:
            print(f"[Threat] Analysis failed: {e}")
            return {
                "overall_threat": "CLEAR",
                "threat_level": "CLEAR",
                "total_events": 0,
                "duration": round(duration, 2),
                "events": [],
                "event_summary": {},
                "error": str(e),
            }

    def _detect_onsets(self, waveform: np.ndarray, sr: int) -> list:
        """Detect sharp onset events (transients) in audio."""
        # Use librosa onset detection
        onset_env = librosa.onset.onset_strength(
            y=waveform, sr=sr, hop_length=HOP_LENGTH
        )
        onsets = librosa.onset.onset_detect(
            onset_envelope=onset_env, sr=sr, hop_length=HOP_LENGTH,
            backtrack=True, units='time'
        )

        # Filter by onset strength — only strong onsets
        onset_strengths = onset_env[librosa.onset.onset_detect(
            onset_envelope=onset_env, sr=sr, hop_length=HOP_LENGTH,
            backtrack=True, units='frames'
        )]

        if len(onset_strengths) == 0:
            return []

        threshold = np.percentile(onset_strengths, 70)

        strong_onsets = []
        for i, (time, strength) in enumerate(zip(onsets, onset_strengths)):
            if strength > threshold:
                strong_onsets.append({
                    "time": float(time),
                    "strength": float(strength),
                })

        return strong_onsets

    def _classify_event(self, waveform: np.ndarray, sr: int,
                        onset: dict) -> dict | None:
        """Classify a single onset event as a threat type."""
        time = onset["time"]
        start = max(0, int(time * sr) - int(sr * 0.05))
        end = min(len(waveform), int(time * sr) + int(sr * 0.5))
        segment = waveform[start:end]

        if len(segment) < 256:
            return None

        # Compute features
        features = self._extract_event_features(segment, sr)

        # Match against threat profiles
        best_match = None
        best_score = 0

        for threat_type, profile in self.THREAT_PROFILES.items():
            score = self._match_profile(features, profile)
            if score > best_score and score > 0.4:
                best_score = score
                best_match = threat_type

        if best_match is None:
            return None

        profile = self.THREAT_PROFILES[best_match]
        return {
            "time": round(time, 3),
            "type": best_match,
            "icon": profile["icon"],
            "confidence": round(best_score, 3),
            "severity": profile["severity"],
            "features": features,
        }

    def _extract_event_features(self, segment: np.ndarray, sr: int) -> dict:
        """Extract spectral and temporal features from an audio event."""
        # Spectral centroid
        centroid = librosa.feature.spectral_centroid(
            y=segment, sr=sr, n_fft=min(N_FFT, len(segment))
        )
        avg_centroid = float(np.mean(centroid))

        # Spectral rolloff
        rolloff = librosa.feature.spectral_rolloff(
            y=segment, sr=sr, n_fft=min(N_FFT, len(segment))
        )
        avg_rolloff = float(np.mean(rolloff))

        # Zero-crossing rate (sharpness indicator)
        zcr = librosa.feature.zero_crossing_rate(segment)
        avg_zcr = float(np.mean(zcr))

        # RMS energy
        rms = float(np.sqrt(np.mean(segment ** 2)))

        # Duration of high-energy portion
        threshold = rms * 0.5
        high_energy_mask = np.abs(segment) > threshold
        high_energy_duration = float(np.sum(high_energy_mask) / sr)

        # Attack time (how quickly energy rises)
        env = np.abs(segment)
        peak_idx = np.argmax(env)
        attack_time = float(peak_idx / sr)

        return {
            "spectral_centroid_hz": round(avg_centroid, 1),
            "spectral_rolloff_hz": round(avg_rolloff, 1),
            "zero_crossing_rate": round(avg_zcr, 4),
            "rms_energy": round(rms, 4),
            "duration": round(high_energy_duration, 4),
            "attack_time": round(attack_time, 4),
        }

    def _match_profile(self, features: dict, profile: dict) -> float:
        """Score how well features match a threat profile."""
        scores = []

        # Frequency range match
        centroid = features["spectral_centroid_hz"]
        lo, hi = profile["peak_freq_range"]
        if lo <= centroid <= hi:
            freq_score = 1.0
        elif centroid < lo:
            freq_score = max(0, 1.0 - (lo - centroid) / lo)
        else:
            freq_score = max(0, 1.0 - (centroid - hi) / hi)
        scores.append(freq_score)

        # Duration match
        dur = features["duration"]
        if profile["min_duration"] <= dur <= profile["max_duration"]:
            dur_score = 1.0
        else:
            dur_score = 0.3
        scores.append(dur_score)

        # Sharpness match (via ZCR)
        zcr = features["zero_crossing_rate"]
        expected_sharpness = profile["sharpness"]
        sharpness_score = max(0, 1.0 - abs(zcr - expected_sharpness))
        scores.append(sharpness_score)

        # Energy (must be significant)
        if features["rms_energy"] > 0.05:
            energy_score = 1.0
        else:
            energy_score = 0.2
        scores.append(energy_score)

        return float(np.mean(scores))

    def _detect_continuous_threats(self, waveform: np.ndarray,
                                   sr: int) -> list:
        """Detect continuous threat sounds (sirens, sustained screams)."""
        events = []

        # Check for sustained high-frequency energy (alarm/siren)
        segment_duration = int(sr * 2)
        for start in range(0, len(waveform) - segment_duration, segment_duration):
            segment = waveform[start:start + segment_duration]

            # Spectral centroid consistency
            centroid = librosa.feature.spectral_centroid(
                y=segment, sr=sr, n_fft=N_FFT
            )[0]

            # Siren detection: oscillating centroid in specific range
            if len(centroid) > 4:
                centroid_std = float(np.std(centroid))
                centroid_mean = float(np.mean(centroid))

                # Siren characteristics: frequency between 500-3000Hz with oscillation
                if (500 < centroid_mean < 3000 and
                        centroid_std > 200 and
                        float(np.sqrt(np.mean(segment ** 2))) > 0.1):
                    events.append({
                        "time": round(float(start / sr), 3),
                        "type": "alarm_siren",
                        "icon": "🚨",
                        "confidence": round(min(0.9, centroid_std / 500), 3),
                        "severity": "medium",
                        "features": {
                            "spectral_centroid_hz": round(centroid_mean, 1),
                            "centroid_oscillation": round(centroid_std, 1),
                        },
                    })

        return events

    def _summarize_events(self, events: list) -> dict:
        """Summarize detected events by type."""
        summary = {}
        for event in events:
            t = event["type"]
            if t not in summary:
                summary[t] = {
                    "count": 0,
                    "icon": event["icon"],
                    "severity": event["severity"],
                }
            summary[t]["count"] += 1
        return summary


# Global instance
threat_detector = ThreatDetector()
