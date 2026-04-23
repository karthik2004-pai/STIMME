"""Stimme Configuration"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
AUDIO_SAMPLES_DIR = os.path.join(DATA_DIR, "audio_samples")
TRAINED_MODELS_DIR = os.path.join(DATA_DIR, "trained_models")
DATABASE_URL = f"sqlite:///{os.path.join(DATA_DIR, 'stimme.db')}"

# Audio processing
SAMPLE_RATE = 16000
SEGMENT_DURATION = 3.0  # seconds
N_MELS = 128
N_FFT = 2048
HOP_LENGTH = 512
N_MFCC = 40

# Training
BATCH_SIZE = 32
EPOCHS = 30
LEARNING_RATE = 0.001
VALIDATION_SPLIT = 0.2
MIN_SAMPLES_PER_CLASS = 5

# Model
YAMNET_MODEL_URL = "https://tfhub.dev/google/yamnet/1"
EMBEDDING_DIM = 1024

# Ensure directories exist
for d in [DATA_DIR, AUDIO_SAMPLES_DIR, TRAINED_MODELS_DIR]:
    os.makedirs(d, exist_ok=True)
