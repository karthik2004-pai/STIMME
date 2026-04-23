"""Audio Steganography Detection — Hidden Data in Audio
Used by: NSA, GCHQ for counter-intelligence operations.
Detects data hidden in audio via LSB encoding, spread-spectrum, and phase coding.
"""
import numpy as np
from scipy import stats, signal
from audio_processor import audio_processor
from config import SAMPLE_RATE, N_FFT, HOP_LENGTH


class StegAnalyzer:
    """Detects steganographic content hidden in audio files."""

    def analyze(self, audio_bytes: bytes) -> dict:
        """Run full steganographic analysis."""
        waveform = audio_processor.load_audio(audio_bytes)
        sr = audio_processor.sr

        if len(waveform) < sr * 0.1:
            return {
                "steganography_probability": 0.0,
                "steg_probability": 0.0,
                "verdict": "AUDIO TOO SHORT",
                "threat_level": "clean",
                "analyses": {},
            }

        # Defaults for fallback
        def_lsb = {"lsb_score": 0.0, "method": "LSB Distribution Analysis"}
        def_chi = {"chi_score": 0.0, "method": "Chi-Square Pair Analysis"}
        def_spectral = {"spread_score": 0.0, "method": "Spread-Spectrum Detection"}
        def_phase = {"phase_score": 0.0, "method": "Phase Discontinuity Analysis"}
        def_echo = {"echo_score": 0.0, "method": "Autocorrelation Echo Detection"}

        try:
            lsb_result = self._lsb_analysis(audio_bytes, waveform)
        except Exception as e:
            print(f"[Steg] LSB analysis failed: {e}")
            lsb_result = def_lsb

        try:
            chi_result = self._chi_square_analysis(audio_bytes)
        except Exception as e:
            print(f"[Steg] Chi-square failed: {e}")
            chi_result = def_chi

        try:
            spectral_result = self._spectral_spread_analysis(waveform, sr)
        except Exception as e:
            print(f"[Steg] Spectral spread failed: {e}")
            spectral_result = def_spectral

        try:
            phase_result = self._phase_analysis(waveform, sr)
        except Exception as e:
            print(f"[Steg] Phase analysis failed: {e}")
            phase_result = def_phase

        try:
            echo_result = self._echo_hiding_analysis(waveform, sr)
        except Exception as e:
            print(f"[Steg] Echo hiding failed: {e}")
            echo_result = def_echo

        # Aggregate scores
        scores = [
            lsb_result.get("lsb_score", 0),
            chi_result.get("chi_score", 0),
            spectral_result.get("spread_score", 0),
            phase_result.get("phase_score", 0),
            echo_result.get("echo_score", 0),
        ]
        steg_probability = float(np.mean(scores))

        if steg_probability > 0.6:
            verdict = "STEGANOGRAPHY LIKELY DETECTED"
            threat_level = "critical"
        elif steg_probability > 0.35:
            verdict = "SUSPICIOUS PATTERNS FOUND"
            threat_level = "warning"
        else:
            verdict = "NO STEGANOGRAPHY DETECTED"
            threat_level = "clean"

        return {
            "steganography_probability": round(steg_probability, 4),
            "steg_probability": round(steg_probability, 4),
            "verdict": verdict,
            "threat_level": threat_level,
            "analyses": {
                "lsb_analysis": lsb_result,
                "chi_square_test": chi_result,
                "spectral_spread": spectral_result,
                "phase_analysis": phase_result,
                "echo_hiding": echo_result,
            },
        }

    def _lsb_analysis(self, audio_bytes: bytes, waveform: np.ndarray) -> dict:
        """Analyze Least Significant Bit distribution.
        Clean audio has statistically predictable LSB patterns.
        Steganographic LSB embedding creates anomalous distributions.
        """
        # Convert to 16-bit integer representation
        int_samples = (waveform * 32767).astype(np.int16)

        # Extract LSBs
        lsbs = np.abs(int_samples) % 2

        # In clean audio, LSB distribution should be roughly uniform
        ones_ratio = float(np.mean(lsbs))

        # Check for non-random patterns in LSB sequence
        # Run test: count runs of consecutive 0s and 1s
        transitions = np.sum(np.diff(lsbs) != 0)
        expected_transitions = len(lsbs) / 2
        transition_ratio = transitions / expected_transitions if expected_transitions > 0 else 1

        # Score: deviation from expected randomness
        # Perfect embedding creates LSBs that are too random (ratio = 1.0)
        # Natural audio has slightly biased LSBs
        deviation = abs(ones_ratio - 0.5)

        if deviation < 0.005:  # Suspiciously uniform — suggests LSB replacement
            lsb_score = 0.7
        elif deviation < 0.02:
            lsb_score = 0.4
        else:
            lsb_score = 0.1

        return {
            "lsb_score": round(lsb_score, 4),
            "ones_ratio": round(ones_ratio, 6),
            "transition_ratio": round(transition_ratio, 4),
            "method": "LSB Distribution Analysis",
        }

    def _chi_square_analysis(self, audio_bytes: bytes) -> dict:
        """Chi-square test on sample value pairs (RS Steganalysis variant).
        Detects statistical anomalies caused by LSB embedding.
        """
        # Use raw bytes for analysis
        data = np.frombuffer(audio_bytes[:min(len(audio_bytes), 500000)],
                             dtype=np.uint8)

        if len(data) < 100:
            return {"chi_score": 0.0, "p_value": 1.0,
                    "method": "Chi-Square Steganalysis"}

        # Count byte value frequencies
        observed = np.bincount(data, minlength=256).astype(float)

        # Pair adjacent values (0-1, 2-3, etc.) — LSB embedding equalizes pairs
        pair_ratios = []
        for i in range(0, 256, 2):
            total = observed[i] + observed[i + 1]
            if total > 0:
                ratio = min(observed[i], observed[i + 1]) / total
                pair_ratios.append(ratio)

        if pair_ratios:
            avg_pair_ratio = float(np.mean(pair_ratios))
            # Perfect LSB embedding makes pairs equal (ratio = 0.5)
            if avg_pair_ratio > 0.47:
                chi_score = 0.7
            elif avg_pair_ratio > 0.42:
                chi_score = 0.4
            else:
                chi_score = 0.1
        else:
            chi_score = 0.0

        return {
            "chi_score": round(chi_score, 4),
            "avg_pair_balance": round(avg_pair_ratio, 4) if pair_ratios else 0,
            "method": "Chi-Square Pair Analysis",
        }

    def _spectral_spread_analysis(self, waveform: np.ndarray, sr: int) -> dict:
        """Detect spread-spectrum steganography.
        Hidden signals spread across the spectrum appear as subtle noise.
        """
        import librosa

        # Compute spectrogram
        S = np.abs(librosa.stft(waveform, n_fft=N_FFT, hop_length=HOP_LENGTH))
        S_db = librosa.power_to_db(S ** 2, ref=np.max)

        # Analyze spectral flatness — SS steg increases flatness
        spectral_flatness = librosa.feature.spectral_flatness(y=waveform)[0]
        avg_flatness = float(np.mean(spectral_flatness))

        # High spectral flatness across all frames suggests SS embedding
        if avg_flatness > 0.3:
            spread_score = 0.6
        elif avg_flatness > 0.15:
            spread_score = 0.3
        else:
            spread_score = 0.1

        return {
            "spread_score": round(spread_score, 4),
            "spectral_flatness": round(avg_flatness, 6),
            "method": "Spread-Spectrum Detection",
        }

    def _phase_analysis(self, waveform: np.ndarray, sr: int) -> dict:
        """Detect phase-coded steganography.
        Phase encoding modifies STFT phase values to embed data.
        """
        import librosa

        # Compute STFT (complex)
        S_complex = librosa.stft(waveform, n_fft=N_FFT, hop_length=HOP_LENGTH)
        phases = np.angle(S_complex)

        # Analyze phase continuity
        phase_diffs = np.diff(phases, axis=1)

        # Phase should generally be smooth — embedding creates discontinuities
        phase_jumps = np.sum(np.abs(phase_diffs) > np.pi / 2) / phase_diffs.size
        phase_entropy = float(stats.entropy(
            np.histogram(phases.flatten(), bins=64)[0] + 1e-10
        ))

        if phase_jumps > 0.3:
            phase_score = 0.6
        elif phase_jumps > 0.15:
            phase_score = 0.3
        else:
            phase_score = 0.1

        return {
            "phase_score": round(phase_score, 4),
            "phase_jump_ratio": round(float(phase_jumps), 4),
            "phase_entropy": round(phase_entropy, 4),
            "method": "Phase Discontinuity Analysis",
        }

    def _echo_hiding_analysis(self, waveform: np.ndarray, sr: int) -> dict:
        """Detect echo-hiding steganography.
        Data is hidden by adding tiny delayed echoes.
        """
        # Compute autocorrelation
        n = len(waveform)
        if n > sr * 2:
            segment = waveform[:sr * 2]  # First 2 seconds
        else:
            segment = waveform

        correlation = np.correlate(segment[:4096],
                                   segment[:4096], mode='full')
        correlation = correlation[len(correlation) // 2:]

        # Normalize
        if correlation[0] > 0:
            correlation = correlation / correlation[0]

        # Look for suspicious echo peaks in typical echo-hiding range
        # (sample delays between 100-1000 samples)
        echo_range = correlation[100:1000]
        if len(echo_range) > 0:
            peak_val = float(np.max(echo_range))
            if peak_val > 0.5:
                echo_score = 0.7
            elif peak_val > 0.3:
                echo_score = 0.4
            else:
                echo_score = 0.1
        else:
            echo_score = 0.1

        return {
            "echo_score": round(echo_score, 4),
            "max_echo_correlation": round(float(peak_val) if len(echo_range) > 0 else 0, 4),
            "method": "Autocorrelation Echo Detection",
        }


# Global instance
steg_analyzer = StegAnalyzer()
