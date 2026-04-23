"""Audio Processing Pipeline for Stimme"""
import io
import numpy as np
import librosa
import soundfile as sf
from config import SAMPLE_RATE, SEGMENT_DURATION, N_MELS, N_FFT, HOP_LENGTH, N_MFCC


class AudioProcessor:
    """Handles all audio preprocessing and feature extraction."""

    def __init__(self, sr=SAMPLE_RATE, duration=SEGMENT_DURATION):
        self.sr = sr
        self.duration = duration
        self.target_length = int(sr * duration)

    def load_audio(self, file_bytes: bytes) -> np.ndarray:
        """Load audio from bytes, resample to target sample rate, convert to mono.
        Supports WAV, MP3, OGG, FLAC, WebM/Opus via multiple fallbacks.
        """
        audio_io = io.BytesIO(file_bytes)
        waveform = None
        orig_sr = None

        # Attempt 1: soundfile (fast, handles WAV, FLAC, OGG)
        try:
            waveform, orig_sr = sf.read(audio_io)
        except Exception:
            pass

        # Attempt 2: librosa (handles MP3 and more via audioread/ffmpeg)
        if waveform is None:
            try:
                audio_io.seek(0)
                waveform, orig_sr = librosa.load(audio_io, sr=None)
            except Exception:
                pass

        # Attempt 3: pydub (handles WebM, Opus, and other browser formats)
        if waveform is None:
            try:
                from pydub import AudioSegment
                audio_io.seek(0)
                audio_seg = AudioSegment.from_file(audio_io)
                # Convert to mono, get raw samples
                audio_seg = audio_seg.set_channels(1)
                samples = np.array(audio_seg.get_array_of_samples(), dtype=np.float32)
                # Normalize to [-1, 1]
                max_val = float(2 ** (audio_seg.sample_width * 8 - 1))
                waveform = samples / max_val
                orig_sr = audio_seg.frame_rate
            except Exception as e:
                print(f"[AudioProcessor] pydub fallback failed: {e}")

        # If all attempts fail, return empty array
        if waveform is None or len(waveform) == 0:
            print("[AudioProcessor] ERROR: Could not decode audio from any format")
            return np.zeros(self.target_length, dtype=np.float32)

        # Convert to mono if stereo
        if len(waveform.shape) > 1:
            waveform = np.mean(waveform, axis=1)

        # Resample if needed
        if orig_sr != self.sr:
            waveform = librosa.resample(waveform, orig_sr=orig_sr, target_sr=self.sr)

        # Normalize
        waveform = waveform.astype(np.float32)
        max_val = np.max(np.abs(waveform))
        if max_val > 0:
            waveform = waveform / max_val

        return waveform

    def pad_or_trim(self, waveform: np.ndarray) -> np.ndarray:
        """Pad or trim waveform to target length."""
        if len(waveform) > self.target_length:
            waveform = waveform[:self.target_length]
        elif len(waveform) < self.target_length:
            padding = self.target_length - len(waveform)
            waveform = np.pad(waveform, (0, padding), mode='constant')
        return waveform

    def extract_mel_spectrogram(self, waveform: np.ndarray) -> np.ndarray:
        """Extract mel spectrogram from waveform.
        NOTE: Caller should pad_or_trim the waveform first if fixed-size is needed.
        """
        mel_spec = librosa.feature.melspectrogram(
            y=waveform, sr=self.sr, n_mels=N_MELS,
            n_fft=N_FFT, hop_length=HOP_LENGTH
        )
        mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
        # Normalize to [0, 1]
        spec_range = mel_spec_db.max() - mel_spec_db.min()
        if spec_range > 0:
            mel_spec_db = (mel_spec_db - mel_spec_db.min()) / spec_range
        else:
            mel_spec_db = np.zeros_like(mel_spec_db)
        return mel_spec_db

    def extract_mfcc(self, waveform: np.ndarray) -> np.ndarray:
        """Extract MFCC features from waveform."""
        waveform = self.pad_or_trim(waveform)
        mfccs = librosa.feature.mfcc(
            y=waveform, sr=self.sr, n_mfcc=N_MFCC,
            n_fft=N_FFT, hop_length=HOP_LENGTH
        )
        # Normalize
        mfccs = (mfccs - np.mean(mfccs)) / (np.std(mfccs) + 1e-8)
        return mfccs

    def extract_chroma(self, waveform: np.ndarray) -> np.ndarray:
        """Extract chroma features."""
        waveform = self.pad_or_trim(waveform)
        chroma = librosa.feature.chroma_stft(
            y=waveform, sr=self.sr, n_fft=N_FFT, hop_length=HOP_LENGTH
        )
        return chroma

    def get_waveform_data(self, waveform: np.ndarray, num_points: int = 500) -> list:
        """Downsample waveform for frontend visualization."""
        if len(waveform) <= num_points:
            return waveform.tolist()
        step = len(waveform) // num_points
        downsampled = waveform[::step][:num_points]
        return downsampled.tolist()

    def get_spectrogram_data(self, waveform: np.ndarray) -> dict:
        """Generate spectrogram data for frontend visualization."""
        # Use a trimmed version for visualization to keep data size reasonable
        trimmed = self.pad_or_trim(waveform)
        mel_spec = self.extract_mel_spectrogram(trimmed)
        return {
            "data": mel_spec.tolist(),
            "shape": list(mel_spec.shape),
            "sample_rate": self.sr,
            "n_mels": N_MELS
        }

    def get_frequency_analysis(self, waveform: np.ndarray) -> dict:
        """Full frequency analysis for the Analyze page."""
        from scipy.fft import fft, fftfreq

        # Compute FFT on windowed signal
        N = len(waveform)
        windowed = waveform * np.hanning(N)
        yf = fft(windowed)
        xf = fftfreq(N, 1 / self.sr)

        # Only positive frequencies
        pos_mask = xf >= 0
        freqs = xf[pos_mask]
        magnitudes = 2.0 / N * np.abs(yf[pos_mask])

        # Downsample for frontend (max 1024 points)
        if len(freqs) > 1024:
            step = len(freqs) // 1024
            freqs = freqs[::step][:1024]
            magnitudes = magnitudes[::step][:1024]

        # Frequency bands analysis
        bands = {
            "sub_bass":   {"range": "20-60 Hz",    "low": 20,   "high": 60},
            "bass":       {"range": "60-250 Hz",   "low": 60,   "high": 250},
            "low_mid":    {"range": "250-500 Hz",  "low": 250,  "high": 500},
            "mid":        {"range": "500-2k Hz",   "low": 500,  "high": 2000},
            "upper_mid":  {"range": "2k-4k Hz",    "low": 2000, "high": 4000},
            "presence":   {"range": "4k-6k Hz",    "low": 4000, "high": 6000},
            "brilliance": {"range": "6k-20k Hz",   "low": 6000, "high": 20000},
        }

        # Compute full-resolution FFT for band analysis
        full_freqs = fftfreq(N, 1 / self.sr)
        full_mags = 2.0 / N * np.abs(yf)
        pos_mask_full = full_freqs >= 0
        ff = full_freqs[pos_mask_full]
        fm = full_mags[pos_mask_full]

        band_energies = {}
        for name, info in bands.items():
            mask = (ff >= info["low"]) & (ff < info["high"])
            energy = float(np.mean(fm[mask] ** 2)) if np.any(mask) else 0
            band_energies[name] = {
                "range": info["range"],
                "energy": round(energy, 8),
                "peak_db": round(float(
                    20 * np.log10(np.max(fm[mask]) + 1e-10)
                ) if np.any(mask) else -100, 2),
            }

        # Dominant frequency
        dominant_idx = np.argmax(fm)
        dominant_freq = float(ff[dominant_idx]) if len(ff) > 0 else 0

        # Spectral features
        spectral_centroid = float(np.mean(
            librosa.feature.spectral_centroid(y=waveform, sr=self.sr)
        ))
        spectral_rolloff = float(np.mean(
            librosa.feature.spectral_rolloff(y=waveform, sr=self.sr)
        ))
        spectral_flatness = float(np.mean(
            librosa.feature.spectral_flatness(y=waveform)
        ))

        return {
            "fft_frequencies": freqs.tolist(),
            "fft_magnitudes": magnitudes.tolist(),
            "bands": band_energies,
            "dominant_frequency_hz": round(dominant_freq, 2),
            "spectral_centroid_hz": round(spectral_centroid, 2),
            "spectral_rolloff_hz": round(spectral_rolloff, 2),
            "spectral_flatness": round(spectral_flatness, 6),
        }

    def get_audio_info(self, waveform: np.ndarray) -> dict:
        """Get basic audio information."""
        duration = len(waveform) / self.sr
        rms = float(np.sqrt(np.mean(waveform ** 2)))
        peak = float(np.max(np.abs(waveform)))
        return {
            "duration": round(duration, 2),
            "sample_rate": self.sr,
            "samples": len(waveform),
            "rms_level": round(rms, 4),
            "peak_level": round(peak, 4)
        }

    def segment_audio(self, waveform: np.ndarray) -> list:
        """Segment long audio into analysis windows."""
        segments = []
        for start in range(0, len(waveform), self.target_length):
            segment = waveform[start:start + self.target_length]
            if len(segment) >= self.target_length // 2:
                segment = self.pad_or_trim(segment)
                segments.append(segment)
        return segments if segments else [self.pad_or_trim(waveform)]

    def augment_audio(self, waveform: np.ndarray) -> list:
        """Generate augmented versions of audio for training."""
        augmented = [waveform]

        # Time shift
        shift = int(self.sr * 0.1)
        shifted = np.roll(waveform, shift)
        augmented.append(shifted)

        # Add noise
        noise = np.random.normal(0, 0.005, len(waveform)).astype(np.float32)
        noisy = waveform + noise
        augmented.append(noisy)

        # Pitch shift (slight)
        try:
            pitched = librosa.effects.pitch_shift(waveform, sr=self.sr, n_steps=1)
            augmented.append(pitched)
            pitched_down = librosa.effects.pitch_shift(waveform, sr=self.sr, n_steps=-1)
            augmented.append(pitched_down)
        except Exception:
            pass

        # Speed change
        try:
            fast = librosa.effects.time_stretch(waveform, rate=1.1)
            fast = self.pad_or_trim(fast)
            augmented.append(fast)
        except Exception:
            pass

        return augmented


# Global instance
audio_processor = AudioProcessor()
