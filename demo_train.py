"""
Stimme Demo — Generate audio samples, upload, train, and test.
This script demonstrates the full Stimme pipeline end-to-end.
"""
import os
import io
import time
import json
import struct
import math
import random
import requests

API = "http://localhost:8000"
SAMPLE_RATE = 16000
DURATION = 3.0  # seconds


def generate_wav_bytes(samples, sr=SAMPLE_RATE):
    """Convert float samples to WAV bytes."""
    buf = io.BytesIO()
    n = len(samples)
    # WAV header
    buf.write(b'RIFF')
    data_size = n * 2
    buf.write(struct.pack('<I', 36 + data_size))
    buf.write(b'WAVE')
    buf.write(b'fmt ')
    buf.write(struct.pack('<I', 16))  # chunk size
    buf.write(struct.pack('<H', 1))   # PCM
    buf.write(struct.pack('<H', 1))   # mono
    buf.write(struct.pack('<I', sr))  # sample rate
    buf.write(struct.pack('<I', sr * 2))  # byte rate
    buf.write(struct.pack('<H', 2))   # block align
    buf.write(struct.pack('<H', 16))  # bits per sample
    buf.write(b'data')
    buf.write(struct.pack('<I', data_size))
    for s in samples:
        s = max(-1.0, min(1.0, s))
        buf.write(struct.pack('<h', int(s * 32767)))
    buf.seek(0)
    return buf.read()


def gen_sine_tone(freq=440, duration=DURATION, sr=SAMPLE_RATE):
    """Pure sine wave tone."""
    n = int(sr * duration)
    return [0.8 * math.sin(2 * math.pi * freq * i / sr) for i in range(n)]


def gen_bird_chirp(duration=DURATION, sr=SAMPLE_RATE):
    """Simulated bird chirp — frequency-modulated bursts."""
    n = int(sr * duration)
    samples = [0.0] * n
    num_chirps = random.randint(4, 8)
    for _ in range(num_chirps):
        start = random.randint(0, n - int(sr * 0.3))
        chirp_len = int(sr * random.uniform(0.1, 0.25))
        f_start = random.uniform(2000, 4000)
        f_end = random.uniform(4000, 8000)
        for j in range(chirp_len):
            if start + j >= n:
                break
            t = j / sr
            freq = f_start + (f_end - f_start) * (j / chirp_len)
            env = math.sin(math.pi * j / chirp_len)  # envelope
            samples[start + j] += 0.6 * env * math.sin(2 * math.pi * freq * t)
    return samples


def gen_engine_rumble(duration=DURATION, sr=SAMPLE_RATE):
    """Simulated engine / vehicle rumble — low-freq harmonics + noise."""
    n = int(sr * duration)
    samples = []
    base_freq = random.uniform(60, 120)
    for i in range(n):
        t = i / sr
        s = 0.0
        # Low harmonics
        for h in range(1, 6):
            s += (0.4 / h) * math.sin(2 * math.pi * base_freq * h * t)
        # Add rumble noise
        s += 0.15 * (random.random() * 2 - 1)
        # Slight amplitude modulation
        s *= 0.7 + 0.3 * math.sin(2 * math.pi * 2 * t)
        samples.append(s * 0.5)
    return samples


def gen_rain(duration=DURATION, sr=SAMPLE_RATE):
    """Simulated rain — filtered noise with random droplet impacts."""
    n = int(sr * duration)
    # Base: pink-ish noise
    samples = []
    prev = 0.0
    for i in range(n):
        white = random.random() * 2 - 1
        # Simple low-pass
        prev = 0.95 * prev + 0.05 * white
        s = prev * 0.5
        # Random droplet clicks
        if random.random() < 0.003:
            click_len = random.randint(10, 40)
            for j in range(click_len):
                if i + j < n:
                    pass  # Will be blended below
            s += 0.3 * (random.random() * 2 - 1)
        samples.append(s)
    return samples


def gen_music(duration=DURATION, sr=SAMPLE_RATE):
    """Simulated simple melody — sequence of notes with harmonics."""
    n = int(sr * duration)
    samples = [0.0] * n
    # C major scale frequencies
    notes = [261.6, 293.7, 329.6, 349.2, 392.0, 440.0, 493.9, 523.3]
    note_dur = int(sr * 0.35)
    idx = 0
    for note_i in range(int(duration / 0.35)):
        freq = random.choice(notes)
        start = int(note_i * sr * 0.35)
        for j in range(note_dur):
            if start + j >= n:
                break
            t = j / sr
            env = math.exp(-3 * j / note_dur)  # decay envelope
            s = 0.5 * env * math.sin(2 * math.pi * freq * t)
            s += 0.2 * env * math.sin(2 * math.pi * freq * 2 * t)  # 2nd harmonic
            s += 0.1 * env * math.sin(2 * math.pi * freq * 3 * t)  # 3rd harmonic
            samples[start + j] += s
    return samples


# ──────────────────────────────────────────────────
# Audio generators by class
# ──────────────────────────────────────────────────
GENERATORS = {
    "Bird Chirp":     (gen_bird_chirp, "Birds", "🐦"),
    "Engine Rumble":  (gen_engine_rumble, "Vehicles", "🚗"),
    "Rain Sound":     (gen_rain, "Weather", "🌧️"),
    "Simple Melody":  (gen_music, "Music", "🎵"),
}

NUM_SAMPLES_PER_CLASS = 6  # enough for training (fewer = faster)


def main():
    print("=" * 60)
    print("  🎵 STIMME DEMO — Full Pipeline Test")
    print("=" * 60)

    # 1. Check server
    print("\n[1/5] Checking server...")
    try:
        r = requests.get(f"{API}/api/models/active", timeout=5)
        data = r.json()
        print(f"  ✓ Server running — Active model: {data.get('active_model', '?')}")
    except Exception as e:
        print(f"  ✗ Server not reachable: {e}")
        print("  → Make sure to run: cd backend && python main.py")
        return

    # 2. Create classes
    print(f"\n[2/5] Creating {len(GENERATORS)} sound classes...")
    class_ids = {}
    for class_name, (gen_fn, category, icon) in GENERATORS.items():
        r = requests.post(f"{API}/api/classes", data={
            "name": class_name,
            "category": category,
            "description": f"Auto-generated demo class: {class_name}",
            "icon": icon
        })
        result = r.json()
        if "error" in result and "already exists" in str(result.get("error", "")).lower():
            # Class might already exist, get ID from classes list
            r2 = requests.get(f"{API}/api/classes")
            all_classes = r2.json().get("classes", [])
            for c in all_classes:
                if c["name"] == class_name:
                    class_ids[class_name] = c["id"]
                    print(f"  ↳ {icon} {class_name} — already exists (ID: {c['id']})")
                    break
        elif "id" in result:
            class_ids[class_name] = result["id"]
            print(f"  ✓ {icon} {class_name} — created (ID: {result['id']})")
        else:
            print(f"  ? {class_name} — response: {result}")
            # Try to find it
            r2 = requests.get(f"{API}/api/classes")
            all_classes = r2.json().get("classes", [])
            for c in all_classes:
                if c["name"] == class_name:
                    class_ids[class_name] = c["id"]
                    print(f"    → Found existing (ID: {c['id']})")
                    break

    if len(class_ids) < 2:
        print("\n  ✗ Need at least 2 classes. Aborting.")
        return

    # 3. Generate & upload samples
    print(f"\n[3/5] Generating & uploading {NUM_SAMPLES_PER_CLASS} samples per class...")
    for class_name, (gen_fn, category, icon) in GENERATORS.items():
        if class_name not in class_ids:
            continue
        cid = class_ids[class_name]
        print(f"\n  {icon} {class_name} (ID: {cid}):")
        for i in range(NUM_SAMPLES_PER_CLASS):
            # Generate with slight variations
            samples = gen_fn()
            wav_bytes = generate_wav_bytes(samples)
            filename = f"{class_name.lower().replace(' ', '_')}_{i+1:02d}.wav"

            files = {"files": (filename, wav_bytes, "audio/wav")}
            r = requests.post(f"{API}/api/classes/{cid}/samples", files=files)
            status = "✓" if r.status_code == 200 else "✗"
            print(f"    {status} {filename} ({len(wav_bytes)//1024}KB)", end="")
            if (i + 1) % 4 == 0:
                print()
            else:
                print("  ", end="")

        print()

    # 4. Train model
    print(f"\n[4/5] Training YAMNet Transfer Learning model...")
    print(f"  Classes: {list(class_ids.keys())}")
    print(f"  Class IDs: {list(class_ids.values())}")

    ids_str = ",".join(str(v) for v in class_ids.values())
    r = requests.post(f"{API}/api/training/start", data={
        "class_ids": ids_str,
        "architecture": "yamnet_transfer",
        "model_name": f"stimme_demo_{int(time.time())}",
        "epochs": "10"
    }, timeout=900)

    result = r.json()
    if result.get("success"):
        print(f"\n  🎉 Training complete!")
        print(f"     Model: {result.get('model_name')}")
        print(f"     Accuracy: {result.get('accuracy', 0) * 100:.1f}%")
        print(f"     Val Accuracy: {result.get('val_accuracy', 0) * 100:.1f}%")
        print(f"     Epochs: {result.get('epochs_trained')}")
        print(f"     Samples used: {result.get('total_samples')}")
    else:
        print(f"\n  ⚠ Training response: {json.dumps(result, indent=2)}")

    # 5. Test classification
    print(f"\n[5/5] Testing classification with new samples...")

    # Activate the trained model
    r = requests.post(f"{API}/api/models/stimme_demo_model/activate")
    print(f"  Model activated: {r.json()}")

    # Generate new test samples and classify
    print("\n  Test Results:")
    print("  " + "-" * 50)
    for class_name, (gen_fn, category, icon) in GENERATORS.items():
        test_samples = gen_fn()
        test_wav = generate_wav_bytes(test_samples)
        files = {"file": ("test.wav", test_wav, "audio/wav")}
        r = requests.post(f"{API}/api/classify/upload", files=files)
        result = r.json()
        preds = result.get("predictions", [])
        if preds:
            top = preds[0]
            match = "✓" if top["class"] == class_name else "✗"
            print(f"  {match} Expected: {icon} {class_name:<15} → Got: {top['class']:<15} ({top['confidence']*100:.1f}%)")
        else:
            print(f"  ✗ No predictions for {class_name}")

    print("\n" + "=" * 60)
    print("  ✅ Demo complete! Open http://localhost:8000 to see results.")
    print("  → Check History tab for all test classifications")
    print("  → Check Models tab to see the trained model")
    print("=" * 60)


if __name__ == "__main__":
    main()
