"""Speaker Diarization — "Who Spoke When" Analysis
Used by: CIA, Five Eyes alliance for surveillance transcription.
Segments audio by speaker identity using spectral clustering.
"""
import numpy as np
import librosa
from scipy.spatial.distance import cdist
from sklearn.cluster import SpectralClustering, KMeans
from sklearn.preprocessing import StandardScaler
from audio_processor import audio_processor
from config import SAMPLE_RATE, N_MFCC


class SpeakerAnalyzer:
    """Speaker diarization using MFCC embeddings and spectral clustering."""

    def __init__(self):
        self.frame_duration = 1.5   # seconds per analysis frame
        self.frame_hop = 0.75       # hop between frames
        self.max_speakers = 8

    def analyze(self, audio_bytes: bytes) -> dict:
        """Full speaker diarization pipeline."""
        waveform = audio_processor.load_audio(audio_bytes)
        sr = audio_processor.sr
        duration = len(waveform) / sr

        if len(waveform) < sr * 0.2:
            return {
                "num_speakers": 0,
                "speaker_count": 0,
                "duration": round(duration, 2),
                "timeline": [],
                "speaker_stats": {},
                "similarity_matrix": [],
            }

        try:
            # Step 1: Voice Activity Detection
            vad_segments = self._voice_activity_detection(waveform, sr)

            if len(vad_segments) < 2:
                return {
                    "num_speakers": 1 if vad_segments else 0,
                    "speaker_count": 1 if vad_segments else 0,
                    "duration": round(duration, 2),
                    "timeline": [{"start": s["start"], "end": s["end"],
                                  "speaker": "Speaker 1", "speaker_id": 0}
                                 for s in vad_segments],
                    "speaker_stats": {"Speaker 1": round(
                        sum(s["end"] - s["start"] for s in vad_segments), 2)} if vad_segments else {},
                    "similarity_matrix": [],
                }

            # Step 2: Extract speaker embeddings for each voiced segment
            embeddings, segment_info = self._extract_speaker_embeddings(
                waveform, sr, vad_segments
            )

            if len(embeddings) < 2:
                return {
                    "num_speakers": 1,
                    "speaker_count": 1,
                    "duration": round(duration, 2),
                    "timeline": [{"start": s["start"], "end": s["end"],
                                  "speaker": "Speaker 1", "speaker_id": 0}
                                 for s in vad_segments],
                    "speaker_stats": {"Speaker 1": round(
                        sum(s["end"] - s["start"] for s in vad_segments), 2)},
                    "similarity_matrix": [],
                }

            # Step 3: Estimate number of speakers
            num_speakers = self._estimate_num_speakers(embeddings)

            # Step 4: Cluster by speaker
            labels = self._cluster_speakers(embeddings, num_speakers)

            # Step 5: Build timeline
            timeline = self._build_timeline(segment_info, labels)

            # Step 6: Compute speaker statistics
            speaker_stats = self._compute_speaker_stats(timeline)

            # Step 7: Similarity matrix
            similarity_matrix = self._compute_similarity_matrix(
                embeddings, labels, num_speakers
            )

            return {
                "num_speakers": int(num_speakers),
                "speaker_count": int(num_speakers),
                "duration": round(duration, 2),
                "timeline": timeline,
                "speaker_stats": speaker_stats,
                "similarity_matrix": similarity_matrix,
            }
        except Exception as e:
            print(f"[Speaker] Analysis failed: {e}")
            return {
                "num_speakers": 1,
                "speaker_count": 1,
                "duration": round(duration, 2),
                "timeline": [{"start": 0.0, "end": round(duration, 2),
                              "speaker": "Speaker 1", "speaker_id": 0}],
                "speaker_stats": {"Speaker 1": round(duration, 2)},
                "similarity_matrix": [],
                "error": str(e),
            }

    def _voice_activity_detection(self, waveform: np.ndarray, sr: int) -> list:
        """Detect voiced segments using energy + ZCR."""
        frame_length = int(sr * 0.03)  # 30ms frames
        hop_length = int(sr * 0.01)    # 10ms hop

        # Compute short-term energy
        energy = np.array([
            np.sum(waveform[i:i + frame_length] ** 2)
            for i in range(0, len(waveform) - frame_length, hop_length)
        ])

        if energy.max() == 0:
            return []

        energy = energy / energy.max()

        # Energy threshold — adaptive
        energy_threshold = max(0.01, np.percentile(energy, 30))

        # Find voiced frames
        voiced = energy > energy_threshold

        # Convert to segments (merge nearby voiced regions)
        segments = []
        in_segment = False
        seg_start = 0

        for i, is_voiced in enumerate(voiced):
            time = i * hop_length / sr
            if is_voiced and not in_segment:
                seg_start = time
                in_segment = True
            elif not is_voiced and in_segment:
                seg_end = time
                if seg_end - seg_start > 0.2:  # Minimum 200ms
                    segments.append({"start": round(seg_start, 3),
                                     "end": round(seg_end, 3)})
                in_segment = False

        if in_segment:
            seg_end = len(waveform) / sr
            if seg_end - seg_start > 0.2:
                segments.append({"start": round(seg_start, 3),
                                 "end": round(seg_end, 3)})

        # Merge segments that are very close (< 300ms gap)
        merged = []
        for seg in segments:
            if merged and seg["start"] - merged[-1]["end"] < 0.3:
                merged[-1]["end"] = seg["end"]
            else:
                merged.append(seg)

        return merged

    def _extract_speaker_embeddings(self, waveform, sr, vad_segments):
        """Extract MFCC-based speaker embeddings per segment."""
        embeddings = []
        segment_info = []

        for seg in vad_segments:
            start_sample = int(seg["start"] * sr)
            end_sample = int(seg["end"] * sr)
            segment = waveform[start_sample:end_sample]

            if len(segment) < sr * 0.2:
                continue

            # Extract MFCCs
            mfccs = librosa.feature.mfcc(y=segment, sr=sr, n_mfcc=N_MFCC,
                                         n_fft=2048, hop_length=512)

            # Also extract delta MFCCs for richer representation
            delta_mfccs = librosa.feature.delta(mfccs)

            # Speaker embedding = mean + std of MFCCs and deltas
            embedding = np.concatenate([
                np.mean(mfccs, axis=1),
                np.std(mfccs, axis=1),
                np.mean(delta_mfccs, axis=1),
            ])

            embeddings.append(embedding)
            segment_info.append(seg)

        return np.array(embeddings), segment_info

    def _estimate_num_speakers(self, embeddings: np.ndarray) -> int:
        """Estimate number of speakers using silhouette analysis."""
        from sklearn.metrics import silhouette_score

        scaler = StandardScaler()
        X = scaler.fit_transform(embeddings)

        best_k = 2
        best_score = -1

        max_k = min(self.max_speakers, len(embeddings) - 1, 6)

        for k in range(2, max_k + 1):
            try:
                km = KMeans(n_clusters=k, n_init=10, random_state=42)
                labels = km.fit_predict(X)
                score = silhouette_score(X, labels)
                if score > best_score:
                    best_score = score
                    best_k = k
            except Exception:
                pass

        return best_k

    def _cluster_speakers(self, embeddings: np.ndarray,
                          num_speakers: int) -> np.ndarray:
        """Cluster segments by speaker using Spectral Clustering."""
        scaler = StandardScaler()
        X = scaler.fit_transform(embeddings)

        try:
            clustering = SpectralClustering(
                n_clusters=num_speakers,
                affinity='rbf',
                random_state=42,
                n_init=10,
            )
            labels = clustering.fit_predict(X)
        except Exception:
            # Fallback to KMeans
            km = KMeans(n_clusters=num_speakers, n_init=10, random_state=42)
            labels = km.fit_predict(X)

        return labels

    def _build_timeline(self, segment_info: list, labels: np.ndarray) -> list:
        """Build speaker timeline."""
        colors = ["#7c3aed", "#06d6a0", "#22d3ee", "#fbbf24",
                   "#f472b6", "#fb7185", "#a78bfa", "#4ade80"]
        timeline = []
        for i, seg in enumerate(segment_info):
            speaker_id = int(labels[i])
            timeline.append({
                "start": seg["start"],
                "end": seg["end"],
                "speaker": f"Speaker {speaker_id + 1}",
                "speaker_id": speaker_id,
                "color": colors[speaker_id % len(colors)],
            })
        return timeline

    def _compute_speaker_stats(self, timeline: list) -> dict:
        """Compute speaking time per speaker."""
        stats = {}
        for entry in timeline:
            name = entry["speaker"]
            duration = entry["end"] - entry["start"]
            if name not in stats:
                stats[name] = 0.0
            stats[name] += duration

        return {k: round(v, 2) for k, v in stats.items()}

    def _compute_similarity_matrix(self, embeddings, labels, num_speakers):
        """Compute speaker-to-speaker similarity matrix."""
        # Compute mean embedding per speaker
        speaker_embeddings = []
        for sid in range(num_speakers):
            mask = labels == sid
            if np.any(mask):
                speaker_embeddings.append(np.mean(embeddings[mask], axis=0))

        if len(speaker_embeddings) < 2:
            return []

        speaker_embeddings = np.array(speaker_embeddings)
        # Cosine similarity
        norms = np.linalg.norm(speaker_embeddings, axis=1, keepdims=True)
        norms[norms == 0] = 1
        normalized = speaker_embeddings / norms
        sim_matrix = np.dot(normalized, normalized.T)

        return [[round(float(v), 4) for v in row] for row in sim_matrix]


# Global instance
speaker_analyzer = SpeakerAnalyzer()
