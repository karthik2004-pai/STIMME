"""Audio Enhancement — Noise Removal & Signal Isolation
Used by: All intelligence agencies for surveillance recording cleanup.
Implements spectral gating and bandpass filtering.
"""
import io
import numpy as np
import librosa
import soundfile as sf
from scipy import signal as scipy_signal
from audio_processor import audio_processor
from config import SAMPLE_RATE


class AudioEnhancer:
    """Cleans up noisy audio recordings."""

    def enhance(self, audio_bytes: bytes) -> dict:
        """Full audio enhancement pipeline. Returns enhanced audio + metrics."""
        waveform = audio_processor.load_audio(audio_bytes)
        sr = audio_processor.sr

        if len(waveform) < sr * 0.1:
            return {
                "success": False,
                "error": "Audio too short for enhancement",
                "before_snr": 0, "after_snr": 0, "improvement": 0,
            }

        try:
            # Compute before metrics
            before_snr = self._estimate_snr(waveform)
            before_rms = float(np.sqrt(np.mean(waveform ** 2)))

            # Step 1: Spectral gating (primary noise reduction)
            denoised = self._spectral_gate(waveform, sr)

            # Step 2: Voice isolation bandpass filter
            voice_isolated = self._voice_bandpass(denoised, sr)

            # Step 3: Normalize
            enhanced = self._normalize(voice_isolated)

            # Compute after metrics
            after_snr = self._estimate_snr(enhanced)
            after_rms = float(np.sqrt(np.mean(enhanced ** 2)))

            # Generate enhanced audio bytes
            enhanced_bytes = self._to_wav_bytes(enhanced, sr)

            # Generate before/after visualization data
            before_waveform = audio_processor.get_waveform_data(waveform, 500)
            after_waveform = audio_processor.get_waveform_data(enhanced, 500)

            return {
                "success": True,
                "enhanced_audio_base64": self._bytes_to_base64(enhanced_bytes),
                "before_snr": round(before_snr, 2),
                "after_snr": round(after_snr, 2),
                "improvement": round(after_snr - before_snr, 2),
                "metrics": {
                    "before_snr_db": round(before_snr, 2),
                    "after_snr_db": round(after_snr, 2),
                    "snr_improvement_db": round(after_snr - before_snr, 2),
                    "before_rms": round(before_rms, 4),
                    "after_rms": round(after_rms, 4),
                    "duration": round(len(waveform) / sr, 2),
                },
                "visualization": {
                    "before_waveform": before_waveform,
                    "after_waveform": after_waveform,
                },
            }
        except Exception as e:
            print(f"[Enhancer] Enhancement failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "before_snr": 0, "after_snr": 0, "improvement": 0,
            }

    def _spectral_gate(self, waveform: np.ndarray, sr: int,
                       noise_reduction: float = 1.5) -> np.ndarray:
        """Remove noise using spectral gating.
        Estimates noise profile from quietest portions,
        then gates out spectral energy below the noise floor.
        """
        n_fft = 2048
        hop_length = 512

        # STFT
        S_complex = librosa.stft(waveform, n_fft=n_fft, hop_length=hop_length)
        S_magnitude = np.abs(S_complex)
        S_phase = np.angle(S_complex)

        # Estimate noise profile from the quietest 10% of frames
        frame_energies = np.sum(S_magnitude ** 2, axis=0)
        noise_frame_count = max(1, int(len(frame_energies) * 0.1))
        noise_frame_indices = np.argsort(frame_energies)[:noise_frame_count]
        noise_profile = np.mean(S_magnitude[:, noise_frame_indices], axis=1,
                                keepdims=True)

        # Apply spectral gate: subtract noise floor with soft mask
        mask = 1.0 - (noise_reduction * noise_profile / (S_magnitude + 1e-10))
        mask = np.clip(mask, 0, 1)

        # Smooth the mask to avoid musical noise artifacts
        from scipy.ndimage import median_filter
        mask = median_filter(mask, size=(1, 5))

        # Apply mask
        S_clean = S_magnitude * mask
        S_clean_complex = S_clean * np.exp(1j * S_phase)

        # Inverse STFT
        denoised = librosa.istft(S_clean_complex, hop_length=hop_length,
                                 length=len(waveform))
        return denoised

    def _voice_bandpass(self, waveform: np.ndarray, sr: int) -> np.ndarray:
        """Apply bandpass filter to isolate human voice frequencies (80Hz-8kHz)."""
        low = 80 / (sr / 2)
        high = min(8000 / (sr / 2), 0.99)  # Ensure below Nyquist

        b, a = scipy_signal.butter(4, [low, high], btype='band')
        filtered = scipy_signal.filtfilt(b, a, waveform)
        return filtered.astype(np.float32)

    def _normalize(self, waveform: np.ndarray) -> np.ndarray:
        """Peak normalize to -1dB."""
        peak = np.max(np.abs(waveform))
        if peak > 0:
            target = 10 ** (-1 / 20)  # -1 dB
            waveform = waveform * (target / peak)
        return waveform

    def _estimate_snr(self, waveform: np.ndarray) -> float:
        """Estimate Signal-to-Noise Ratio in dB."""
        # Split into frames
        frame_size = 1024
        hop = 512
        frames = librosa.util.frame(waveform, frame_length=frame_size,
                                     hop_length=hop)
        frame_energies = np.sum(frames ** 2, axis=0)

        if len(frame_energies) < 4:
            return 0.0

        # Signal: top 25% energy frames, Noise: bottom 25%
        sorted_energies = np.sort(frame_energies)
        n = len(sorted_energies)
        noise_energy = np.mean(sorted_energies[:n // 4]) + 1e-10
        signal_energy = np.mean(sorted_energies[3 * n // 4:]) + 1e-10

        snr = 10 * np.log10(signal_energy / noise_energy)
        return float(snr)

    def _to_wav_bytes(self, waveform: np.ndarray, sr: int) -> bytes:
        """Convert waveform to WAV bytes."""
        buffer = io.BytesIO()
        sf.write(buffer, waveform, sr, format='WAV', subtype='PCM_16')
        buffer.seek(0)
        return buffer.read()

    def _bytes_to_base64(self, data: bytes) -> str:
        """Convert bytes to base64 string."""
        import base64
        return base64.b64encode(data).decode('utf-8')


# Global instance
audio_enhancer = AudioEnhancer()
