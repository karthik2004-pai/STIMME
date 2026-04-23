/* ═══════════════════════════════════════════════════════════
   STIMME — AI Chatbot User Manual
   Interactive guide for the Stimme Audio Intelligence Suite
   ═══════════════════════════════════════════════════════════ */

// ═══ KNOWLEDGE BASE ═══
const KNOWLEDGE_BASE = {

    // ── GENERAL ──
    general: {
        keywords: ['what is stimme', 'about', 'overview', 'introduction', 'hello', 'hi', 'help', 'hey', 'start', 'welcome'],
        title: 'Welcome to Stimme',
        answer: `**Stimme** (German for "Voice") is an AI-powered Audio Intelligence Suite. It can:

🎯 **Identify sounds** — Upload or record audio to classify it using YAMNet (521 sound categories)
🔬 **Analyze frequencies** — Deep spectral analysis with real-time FFT visualizations
🛡️ **Intel suite** — Forensics, speaker diarization, steganography detection, threat detection & audio enhancement
📂 **Manage classes** — Create custom sound categories with audio samples
🧠 **Train models** — Train your own classifiers using transfer learning or custom CNNs
⚡ **Model management** — Switch between pre-trained and custom models

**Need help with something specific?** Ask me about any feature!`,
        suggestions: ['How to identify a sound?', 'What is the Analyze tab?', 'How to train a model?']
    },

    // ── IDENTIFY PAGE ──
    identify: {
        keywords: ['identify', 'classify', 'recognition', 'detect', 'upload audio', 'what sound', 'identify sound', 'classification'],
        title: 'Identify Sound',
        answer: `The **Identify** page is the main feature of Stimme. Here's how to use it:

**📁 Upload a file:**
1. Click the upload zone or drag & drop an audio file
2. Supported formats: WAV, MP3, OGG, FLAC, WEBM
3. Click "🎯 Identify Sound" to classify

**🎙️ Record live:**
1. Click the microphone button to start recording
2. Make the sound you want to identify
3. Click again to stop recording
4. Click "🎯 Identify Sound" to classify

**📊 Results show:**
- Top prediction with confidence percentage
- Confidence meter (circular gauge)
- All top predictions ranked with bar chart
- Model used for classification

The default model is **YAMNet** which recognizes **521 different sounds** including animals, vehicles, music, speech, weather, and more!`,
        suggestions: ['What formats are supported?', 'How accurate is the identification?', 'Can I use my own model?']
    },

    // ── UPLOAD FORMAT ──
    formats: {
        keywords: ['format', 'file type', 'wav', 'mp3', 'ogg', 'flac', 'webm', 'supported', 'audio format'],
        title: 'Supported Audio Formats',
        answer: `Stimme supports all major audio formats:

| Format | Extension | Notes |
|--------|-----------|-------|
| WAV    | .wav      | Best quality, uncompressed |
| MP3    | .mp3      | Most common, compressed |
| OGG    | .ogg      | Open format, good quality |
| FLAC   | .flac     | Lossless compression |
| WEBM   | .webm     | Browser recording format |

**💡 Tips:**
- WAV files give the best classification results
- Very short clips (<1 second) may be less accurate
- The system automatically converts all audio to 16kHz mono for analysis
- Microphone recordings are saved as WEBM format`,
        suggestions: ['How to get best accuracy?', 'Can I record from microphone?']
    },

    // ── RECORDING ──
    recording: {
        keywords: ['record', 'microphone', 'mic', 'live', 'real-time', 'capture', 'recording'],
        title: 'Recording Audio',
        answer: `To record audio with your microphone:

1. **Click the 🎙️ button** on the Identify page
2. **Allow microphone access** when your browser asks
3. The button turns red and shows a **timer**
4. **Make the sound** you want to identify
5. **Click the ⏹️ button** to stop recording
6. Your recording appears in the preview area
7. Click **"🎯 Identify Sound"** to classify it

**⚠️ Tips:**
- Make sure your microphone is not muted
- Record in a quiet environment for best results
- 2-5 seconds is usually enough for identification
- The recording is saved as WebM format`,
        suggestions: ['How to identify the recording?', 'What if microphone is not working?']
    },

    // ── ANALYZE PAGE ──
    analyze: {
        keywords: ['analyze', 'frequency', 'spectrum', 'spectral', 'fft', 'waveform', 'spectrogram', 'heatmap', 'bands'],
        title: 'Frequency Spectrum Analyzer',
        answer: `The **Analyze** page provides deep spectral analysis of any audio file:

**🎵 How to use:**
1. Drop an audio file on the upload zone
2. The analyzer automatically processes the file

**📊 What you see:**
- **⚡ Real-Time FFT Spectrum** — Live frequency bars during playback (128 bands with peak hold)
- **🌈 Spectrogram Heatmap** — Color-coded frequency-over-time visualization
- **〰️ Waveform** — The raw audio waveform shape

**🎛️ Playback Controls:**
- ▶️/⏸️ Play/Pause button
- Seek bar to scrub through audio
- Volume control

**📊 Frequency Bands:**
Shows energy in 7 bands: Sub-Bass (20-60Hz), Bass (60-250Hz), Low-Mid (250-500Hz), Mid (500-2kHz), Upper-Mid (2k-4kHz), Presence (4k-6kHz), Brilliance (6k-20kHz)

**🔎 Spectral Features:**
Spectral Centroid, Rolloff, Flatness, Dominant Frequency, RMS Level, Peak Level`,
        suggestions: ['What is spectral centroid?', 'What do the frequency bands mean?', 'How to use the player?']
    },

    // ── SPECTRAL FEATURES ──
    spectral: {
        keywords: ['centroid', 'rolloff', 'flatness', 'rms', 'peak', 'dominant frequency', 'spectral feature'],
        title: 'Spectral Features Explained',
        answer: `Here's what each spectral feature means:

**📊 Spectral Centroid** — The "center of mass" of the frequency spectrum. Higher values = brighter, more treble-heavy sound. Lower values = darker, bass-heavy.

**📉 Spectral Rolloff** — The frequency below which 85% of the energy lies. Helps distinguish voiced from unvoiced sounds.

**📈 Spectral Flatness** — How "noisy" vs "tonal" the sound is. Values near 1 = noise-like, near 0 = tonal/pitched.

**🎵 Dominant Frequency** — The single strongest frequency in the signal (in Hz).

**📊 RMS Level** — Root Mean Square energy level. Represents the average loudness.

**🔊 Peak Level** — The maximum amplitude reached in the audio.`,
        suggestions: ['What is the Analyze page?', 'What do frequency bands mean?']
    },

    // ── FREQUENCY BANDS ──
    freqbands: {
        keywords: ['band', 'bass', 'mid', 'treble', 'sub bass', 'presence', 'brilliance', 'frequency band'],
        title: 'Frequency Bands',
        answer: `The Analyze page shows energy in 7 frequency bands:

| Band | Range | What you hear |
|------|-------|---------------|
| **Sub-Bass** | 20-60 Hz | Deep rumble, earthquake, bass drops |
| **Bass** | 60-250 Hz | Bass guitar, kick drums, male voice fundamental |
| **Low-Mid** | 250-500 Hz | Body/warmth of instruments |
| **Mid** | 500-2kHz | Vocals, most instruments |
| **Upper-Mid** | 2k-4kHz | Presence, clarity, consonants |
| **Presence** | 4k-6kHz | Brightness, definition |
| **Brilliance** | 6k-20kHz | Air, sparkle, cymbals, sibilance |

The **bar meters** show relative energy in each band. The **dB values** show the peak level in decibels.`,
        suggestions: ['What is the Analyze page?', 'Explain spectral features']
    },

    // ── INTELLIGENCE ──
    intelligence: {
        keywords: ['intelligence', 'intel', 'forensics', 'forensic', 'speaker', 'diarization', 'steganography', 'steg', 'threat', 'enhance', 'enhancement', 'defense'],
        title: 'Audio Intelligence Suite',
        answer: `The **Intel** page provides 5 advanced analysis modules:

**🔍 Forensics** — Detects audio tampering, splicing, recompression, and manipulation. Shows tampering probability percentage.

**🎭 Speakers** — Identifies different speakers in the audio and creates a "who spoke when" timeline with speaking time stats.

**🔐 Steganography** — Scans for hidden data embedded in audio using LSB analysis, chi-square tests, phase analysis, and echo hiding detection.

**💥 Threats** — Detects acoustic threats like gunshots, explosions, screams, breaking glass, and alarms with severity levels.

**🧹 Enhance** — Removes noise and isolation voice using spectral gating and bandpass filtering. Shows before/after comparison and lets you download the enhanced audio.

**How to use:** Upload an audio file, then click any tab to run that analysis. All processing is 100% local — no data leaves your system.`,
        suggestions: ['How does forensics work?', 'How does speaker detection work?', 'How to enhance audio?']
    },

    // ── FORENSICS ──
    forensics: {
        keywords: ['forensics', 'tampering', 'splice', 'enf', 'compression', 'noise floor', 'fake', 'manipulated', 'deepfake'],
        title: 'Audio Forensics',
        answer: `The Forensics analyzer checks audio for signs of tampering:

**✂️ Splice Detection** — Finds abrupt discontinuities in the waveform that could indicate cut/paste editing.

**⚡ ENF Analysis** — Checks power line frequency (50/60 Hz) consistency. Edited recordings may show ENF jumps.

**📦 Compression Analysis** — Detects if audio was re-compressed (a sign of editing). Checks for frequency cutoff artifacts.

**📊 Noise Floor Analysis** — Splits audio into segments and compares noise levels. Inconsistencies suggest editing.

**🧮 Statistical Analysis** — Checks mathematical properties (kurtosis, distribution) for anomalies that suggest manipulation.

**Results show:**
- **Verdict** — Clean / Warning / Suspicious
- **Tampering Probability** — 0-100% score
- Individual scores for each analysis method`,
        suggestions: ['What is ENF analysis?', 'What about steganography?', 'How accurate is tampering detection?']
    },

    // ── SPEAKERS ──
    speakers: {
        keywords: ['speaker', 'diarization', 'who spoke', 'voice', 'timeline', 'conversation', 'multiple speakers'],
        title: 'Speaker Diarization',
        answer: `Speaker diarization identifies **who spoke when** in an audio recording:

**How it works:**
1. Audio is split into segments
2. Voice embeddings (MFCCs) are extracted from each segment
3. Clustering groups similar voices together
4. A color-coded timeline shows each speaker

**What you see:**
- **Speaker count** — Number of unique speakers detected
- **Timeline** — Color-coded blocks showing when each speaker talks
- **Speaking time** — Duration each speaker talked

**💡 Tips:**
- Works best with clear, distinct speakers
- Background noise may create false speakers
- Minimum recommended audio length: 10 seconds
- Works with conversations, meetings, interviews`,
        suggestions: ['How does forensics work?', 'How to enhance audio?']
    },

    // ── STEGANOGRAPHY ──
    steganalysis: {
        keywords: ['steganography', 'hidden', 'lsb', 'chi square', 'phase', 'echo hiding', 'embedded data', 'secret message'],
        title: 'Steganography Detection',
        answer: `Steganography detection finds hidden data embedded in audio files:

**🔢 LSB Analysis** — Checks if Least Significant Bits have been manipulated to hide data. Equal 0/1 ratio suggests embedding.

**📈 Chi-Square Test** — Statistical test for patterns in sample pairs. Unnatural distributions indicate hidden data.

**📡 Spectral Spread** — Analyzes if spectral energy distribution is unnaturally flat (a sign of spread-spectrum hiding).

**🔄 Phase Analysis** — Detects unusual phase jumps between consecutive samples that could carry hidden data.

**🔊 Echo Hiding** — Detects hidden echoes embedded in the audio signal (a technique for data hiding).

**Results:**
- Overall steganography probability (0-100%)
- Individual technique scores
- Verdict: Clean / Warning / Suspicious`,
        suggestions: ['What is forensics?', 'What about threat detection?']
    },

    // ── THREATS ──
    threats: {
        keywords: ['threat', 'gunshot', 'explosion', 'scream', 'alarm', 'glass', 'break', 'danger', 'acoustic threat'],
        title: 'Acoustic Threat Detection',
        answer: `Threat detection identifies dangerous acoustic events:

**Types of threats detected:**
- 🔫 **Gunshots** — Sharp transients with specific spectral signatures
- 💥 **Explosions** — High-energy broadband events
- 😱 **Screams** — High-pitched sustained vocalizations
- 🚨 **Alarms/Sirens** — Regular tonal patterns
- 💔 **Breaking Glass** — High-frequency shattering patterns
- 🚗 **Vehicle Crashes** — Impact sounds with specific characteristics

**Threat levels:**
- ✅ **CLEAR** — No threats detected
- ⚠️ **MEDIUM** — Possible threat events
- 🔶 **HIGH** — Likely threat events detected
- 🚨 **CRITICAL** — Multiple high-confidence threats

Each event shows: type, timestamp, confidence score, and severity.`,
        suggestions: ['What is the Intel page?', 'How to enhance audio?']
    },

    // ── AUDIO ENHANCEMENT ──
    enhance: {
        keywords: ['enhance', 'noise removal', 'denoise', 'clean', 'restore', 'improve', 'noise reduction', 'snr', 'filter'],
        title: 'Audio Enhancement',
        answer: `Audio enhancement cleans up noisy recordings:

**Enhancement pipeline:**
1. **Spectral Gating** — Estimates noise profile from quiet parts, then removes spectral energy below the noise floor
2. **Voice Bandpass Filter** — Isolates voice frequencies (80Hz-8kHz) to remove rumble and hiss
3. **Normalization** — Normalizes output to -1 dB for consistent volume

**Metrics shown:**
- **Before SNR** — Signal-to-Noise Ratio before enhancement
- **After SNR** — SNR after enhancement
- **Improvement** — How many dB of noise was removed

**Visualization:**
- Side-by-side waveform comparison (before vs after)
- Download button for the enhanced audio (WAV format)

**💡 Best for:** Phone recordings, surveillance audio, noisy interviews, outdoor recordings`,
        suggestions: ['What is the Intel page?', 'How does forensics work?']
    },

    // ── CLASSES ──
    classes: {
        keywords: ['class', 'classes', 'category', 'categories', 'sound class', 'manage', 'create class', 'sample', 'dataset'],
        title: 'Sound Classes',
        answer: `The **Classes** page manages sound categories for custom model training:

**Default categories include:**
🐦 Birds (Crow, Sparrow, Owl, Eagle, Parrot, etc.)
🚗 Vehicles (Car Engine, Motorcycle, Truck, Train, etc.)
🌧️ Weather (Rain, Thunder, Wind, etc.)
🎵 Music (Piano, Guitar, Drums, etc.)
🗣️ Human (Speech, Laugh, Clap, etc.)
🌿 Nature (Water Stream, Ocean Waves, Forest, etc.)
🏙️ Urban (Construction, Traffic, Door Knock, etc.)

**How to create a custom class:**
1. Click **"➕ Create Class"**
2. Enter a name, select a category, add description
3. Click **"Create Class"**

**How to upload audio samples:**
1. Click on a class card to open its detail view
2. Drag & drop audio files to the upload zone
3. Multiple files can be uploaded at once
4. Each sample shows duration and filename

**💡 Minimum 10 samples per class recommended for training.**`,
        suggestions: ['How to train a model?', 'How many samples do I need?']
    },

    // ── TRAINING ──
    training: {
        keywords: ['train', 'training', 'custom model', 'transfer learning', 'yamnet transfer', 'cnn', 'epochs', 'accuracy', 'build model'],
        title: 'Train Custom Model',
        answer: `The **Train** page lets you build your own audio classifiers:

**Step 1: Select Classes**
- Check the classes you want your model to recognize
- Each class must have audio samples uploaded
- Select at least 2 classes

**Step 2: Choose Architecture**
| Architecture | Speed | Accuracy | Min Samples |
|-------------|-------|----------|-------------|
| **YAMNet Transfer** | ~1-2 min | High | 10/class |
| **Custom CNN** | ~5-10 min | Good | 50/class |

**Step 3: Configure**
- Model Name (optional, auto-generated if empty)
- Epochs (default: 30, more = potentially better accuracy)

**Step 4: Train**
- Click **"🚀 Start Training"**
- Progress bar shows epoch, accuracy, and validation accuracy
- Training happens on your local machine

**After training:**
- Go to **Models** page to see your new model
- Click **"Activate"** to use it for classification

**💡 YAMNet Transfer Learning is recommended** — it uses Google's pre-trained embeddings so it needs fewer samples and trains faster.`,
        suggestions: ['What is YAMNet transfer learning?', 'How to manage models?', 'How many samples needed?']
    },

    // ── YAMNET ──
    yamnet: {
        keywords: ['yamnet', 'pretrained', 'google', '521', 'pre-trained', 'default model', 'audioset'],
        title: 'YAMNet Model',
        answer: `**YAMNet** (Yet Another Mobile Network) is Google's pre-trained audio classifier:

**Key facts:**
- Trained on **AudioSet** — millions of labeled audio clips
- Recognizes **521 sound categories**
- Runs entirely **offline** on your machine
- Uses **16kHz mono** audio input
- Based on **MobileNet v1** architecture

**What it can identify:**
Animals, vehicles, music instruments, speech, nature sounds, urban sounds, household sounds, and many more.

**Transfer Learning:**
You can use YAMNet's trained embeddings (1024-dimensional vectors) as features for your own custom classifier. This is much faster than training from scratch.

**💡 YAMNet is the default model** — it's loaded automatically when the server starts.`,
        suggestions: ['How to train a custom model?', 'What is the CNN option?']
    },

    // ── CNN MODEL ──
    cnn: {
        keywords: ['cnn', 'custom cnn', 'convolutional', 'conv2d', 'mel spectrogram', 'from scratch'],
        title: 'Custom CNN Model',
        answer: `The **Custom CNN** option trains a Convolutional Neural Network from scratch:

**Architecture:**
- 4 Conv2D blocks with BatchNorm and MaxPooling
- GlobalAveragePooling → Dense layers → Softmax
- Trained on mel spectrograms (128 bands × time)

**When to use CNN:**
- You have **50+ samples per class**
- You want a model specialized for your exact use case
- YAMNet transfer learning isn't giving good enough results

**Training settings:**
- Default epochs: 30 (uses early stopping with patience=5)
- Batch size: 32
- Optimizer: Adam (lr=0.001)
- Loss: Categorical crossentropy

**⚠️ Requires more data** compared to YAMNet transfer learning but can achieve better accuracy for niche categories.`,
        suggestions: ['What about YAMNet transfer learning?', 'How many samples needed?']
    },

    // ── MODELS PAGE ──
    models: {
        keywords: ['model', 'models page', 'activate', 'switch model', 'model management', 'available models'],
        title: 'Model Management',
        answer: `The **Models** page shows all available classifiers:

**Default model:**
- **YAMNet (Pre-trained)** — Loaded automatically, 521 classes

**Custom models** appear here after training:
- Shows architecture, number of classes, and status
- **"Activate"** button to switch to that model
- Active model shows a green "● Active" badge

**Model status indicators:**
- ✅ **loaded** — Ready to use
- 💾 **saved** — On disk, will load when activated
- 🔴 **not_loaded** — Not yet initialized

**How to switch models:**
1. Go to Models page
2. Find the model you want
3. Click **"Activate"**
4. The model status in the top nav bar updates
5. All new classifications use the new model`,
        suggestions: ['How to train a model?', 'What is YAMNet?']
    },

    // ── HISTORY ──
    history: {
        keywords: ['history', 'past', 'previous', 'log', 'results', 'classification history'],
        title: 'Classification History',
        answer: `The **History** page shows all past classification results:

**Columns shown:**
- ⏰ **Time** — When the classification was performed
- 📁/🎙️ **Source** — Upload or microphone recording
- 📄 **Filename** — The audio file name
- 🎯 **Prediction** — The top predicted class with icon
- 📊 **Confidence** — Prediction confidence percentage
- ⚡ **Model** — Which model was used

**Color coding:**
- Green confidence = High (>50%)
- Yellow confidence = Low (<50%)

**💡 History is stored in a local SQLite database** and persists between server restarts. The last 50 classifications are shown.`,
        suggestions: ['How to identify a sound?', 'How to clear history?']
    },

    // ── ACCURACY TIPS ──
    accuracy: {
        keywords: ['accuracy', 'improve', 'better', 'not accurate', 'wrong', 'incorrect', 'tips', 'best results', 'efficient'],
        title: 'Improving Classification Accuracy',
        answer: `Here are tips for getting the best results:

**🎤 Recording quality:**
- Use a good microphone
- Record in a quiet environment
- Keep 2-5 seconds of the target sound
- Avoid background noise

**📁 File quality:**
- WAV format gives best results
- 16kHz or higher sample rate
- Mono or stereo (auto-converted)
- Clear, isolated sounds work best

**🧠 Custom model tips:**
- Upload at least 10-20 samples per class
- Include variety (different distances, volumes)
- Use augmentation (the system adds some automatically)
- More epochs ≠ always better (watch validation accuracy)
- YAMNet transfer learning works best with 10-50 samples

**⚠️ Known limitation:**
The pre-trained YAMNet works with 521 AudioSet categories. If your sound isn't in those categories, train a custom model!`,
        suggestions: ['How to train a custom model?', 'What formats are supported?']
    },

    // ── TROUBLESHOOTING ──
    troubleshoot: {
        keywords: ['error', 'not working', 'problem', 'issue', 'bug', 'fix', 'trouble', 'fail', 'crash', 'broken', 'cant', "can't", 'doesnt', "doesn't"],
        title: 'Troubleshooting',
        answer: `Common issues and solutions:

**🔴 "Connecting..." status bar**
→ The backend server is not running. Start it with:
\`cd backend && python main.py\`

**🔴 Microphone not working**
→ Allow microphone permission in your browser
→ Check if another app is using the mic
→ Try refreshing the page

**🔴 Classification takes too long**
→ YAMNet loading for first time can take 30-60s
→ Large audio files take longer to process
→ Check server console for errors

**🔴 "Classification failed" error**
→ File might be corrupted or unsupported format
→ Install ffmpeg for broader format support
→ Check server console for the specific error

**🔴 Training fails**
→ Make sure you have enough samples (min 10)
→ At least 2 classes must be selected
→ Check disk space for model saving

**🔴 Audio not playing in Analyze**
→ Try a different audio format
→ Some browsers block autoplay — click the play button`,
        suggestions: ['How to start the server?', 'What formats are supported?']
    },

    // ── SERVER SETUP ──
    setup: {
        keywords: ['setup', 'install', 'run', 'server', 'start', 'launch', 'deployment', 'requirements', 'python', 'pip'],
        title: 'Server Setup',
        answer: `**How to start Stimme:**

**1. Install dependencies:**
\`\`\`
cd backend
pip install -r requirements.txt
\`\`\`

**2. (Optional) Install ffmpeg** for full audio format support:
- Windows: \`choco install ffmpeg\` or download from ffmpeg.org
- Mac: \`brew install ffmpeg\`
- Linux: \`sudo apt install ffmpeg\`

**3. Start the server:**
\`\`\`
cd backend
python main.py
\`\`\`

**4. Open in browser:**
→ http://localhost:8000

**What happens on first start:**
- SQLite database is created
- Default sound classes are initialized
- YAMNet model is downloaded (~100MB, one-time)
- Server is ready when you see "🚀 Stimme is ready"

**Requirements:** Python 3.8+, 4GB+ RAM (for TensorFlow)`,
        suggestions: ['What is Stimme?', 'How to identify a sound?']
    },

    // ── ARCHITECTURE OVERVIEW ──
    architecture: {
        keywords: ['architecture', 'tech stack', 'technology', 'backend', 'frontend', 'api', 'database', 'how it works internally'],
        title: 'Technical Architecture',
        answer: `**Stimme Architecture:**

**Frontend:**
- Pure HTML + CSS + JavaScript (no framework)
- Canvas-based visualizations (waveform, spectrogram, FFT)
- Web Audio API for playback and analysis

**Backend:**
- FastAPI (Python) — REST API server
- TensorFlow + TF Hub — ML models
- librosa — Audio processing
- SQLAlchemy + SQLite — Database

**Key API endpoints:**
- \`POST /api/classify/upload\` — Classify uploaded audio
- \`POST /api/classify/record\` — Classify recorded audio
- \`POST /api/analyze/upload\` — Frequency analysis
- \`POST /api/intel/*\` — Intelligence modules
- \`GET/POST /api/classes\` — Class management
- \`POST /api/training/start\` — Model training
- \`GET /api/models\` — Model management

**All processing is 100% local** — no cloud, no API keys, no data leaves your machine.`,
        suggestions: ['How to start the server?', 'What is YAMNet?']
    },

    // ── SAMPLES NEEDED ──
    samples: {
        keywords: ['how many sample', 'sample count', 'samples needed', 'minimum sample', 'enough data', 'data amount'],
        title: 'How Many Samples Needed?',
        answer: `**Recommended sample counts:**

| Model | Minimum | Recommended | Best |
|-------|---------|-------------|------|
| YAMNet Transfer | 10/class | 20-50/class | 100+/class |
| Custom CNN | 50/class | 100-200/class | 500+/class |

**Tips for building your dataset:**
- Include **variety** — different distances, volumes, backgrounds
- The system **automatically augments** with:
  - Time shifting
  - Noise addition  
  - Pitch shifting (±1 semitone)
  - Speed change (1.1x)
- Each uploaded sample generates ~5-6 augmented versions
- So 10 uploads ≈ 50-60 training samples

**Quality over quantity!** 10 clear, diverse samples often outperform 100 similar ones.`,
        suggestions: ['How to train a model?', 'What is transfer learning?']
    },
};

// ═══ CHATBOT ENGINE ═══
class StimmeChatbot {
    constructor() {
        this.conversationHistory = [];
        this.isOpen = false;
        this.currentPage = 'identify';
        this.messageCount = 0;
    }

    /**
     * Find the best matching knowledge base entry for a user query
     */
    findAnswer(query) {
        const q = query.toLowerCase().trim();

        // Direct keyword matching with scoring
        let bestMatch = null;
        let bestScore = 0;

        for (const [key, entry] of Object.entries(KNOWLEDGE_BASE)) {
            let score = 0;

            for (const keyword of entry.keywords) {
                if (q.includes(keyword)) {
                    // Exact phrase match = higher score
                    score += keyword.split(' ').length * 3;
                }
                // Individual word matching
                const qWords = q.split(/\s+/);
                const kwWords = keyword.split(/\s+/);
                for (const kw of kwWords) {
                    if (kw.length > 2 && qWords.some(w => w.includes(kw) || kw.includes(w))) {
                        score += 1;
                    }
                }
            }

            if (score > bestScore) {
                bestScore = score;
                bestMatch = entry;
            }
        }

        // If no match found, return help message
        if (!bestMatch || bestScore < 2) {
            return {
                title: "I can help with that!",
                answer: `I'm not sure I understand that specific question. Here are some topics I can help with:

• **"How to identify a sound?"** — Using the Identify page
• **"What is the Analyze tab?"** — Frequency analysis
• **"How does Intel work?"** — Intelligence suite
• **"How to train a model?"** — Custom model training
• **"How to manage classes?"** — Sound class management
• **"Troubleshooting"** — Common issues and fixes
• **"Setup guide"** — How to install and run Stimme

Try asking about any feature or say **"help"** for an overview!`,
                suggestions: ['What is Stimme?', 'How to identify a sound?', 'Troubleshooting']
            };
        }

        return bestMatch;
    }

    /**
     * Get context-aware suggestions based on current page
     */
    getPageSuggestions(page) {
        const pageSuggestions = {
            identify: ['How to identify a sound?', 'What formats are supported?', 'Tips for better accuracy'],
            analyze: ['What do the frequency bands mean?', 'Explain spectral features', 'How to use the player?'],
            intelligence: ['How does forensics work?', 'Speaker detection', 'How to enhance audio?'],
            classes: ['How to create a class?', 'How many samples needed?', 'How to upload samples?'],
            train: ['How to train a model?', 'YAMNet vs CNN?', 'How many epochs?'],
            models: ['How to switch models?', 'What is YAMNet?', 'Custom model info'],
            history: ['What does history show?', 'How to identify a sound?', 'Improving accuracy'],
        };
        return pageSuggestions[page] || pageSuggestions.identify;
    }

    /**
     * Process a user message and return a response
     */
    processMessage(userMessage) {
        this.conversationHistory.push({ role: 'user', text: userMessage });

        const result = this.findAnswer(userMessage);

        const response = {
            title: result.title,
            text: result.answer,
            suggestions: result.suggestions || this.getPageSuggestions(this.currentPage)
        };

        this.conversationHistory.push({ role: 'bot', text: response.text });
        this.messageCount++;

        return response;
    }

    /**
     * Get initial greeting
     */
    getGreeting() {
        return {
            title: '👋 Hi! I\'m the Stimme Guide',
            text: `Welcome! I'm your interactive guide for the **Stimme Audio Intelligence Suite**.

I can help you with:
• 🎯 Identifying sounds
• 🔬 Audio frequency analysis
• 🛡️ Intelligence features
• 🧠 Training custom models
• 🔧 Troubleshooting issues

**What would you like to know?**`,
            suggestions: this.getPageSuggestions(this.currentPage)
        };
    }
}

// ═══ CHATBOT UI CONTROLLER ═══
class ChatbotUI {
    constructor() {
        this.bot = new StimmeChatbot();
        this.isOpen = false;
        this.isMinimized = false;
        this.hasGreeted = false;
    }

    init() {
        // Toggle button
        const toggleBtn = document.getElementById('chatbotToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }

        // Close button
        const closeBtn = document.getElementById('chatbotClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Minimize button
        const minBtn = document.getElementById('chatbotMinimize');
        if (minBtn) {
            minBtn.addEventListener('click', () => this.minimize());
        }

        // Send button
        const sendBtn = document.getElementById('chatSendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Input field
        const input = document.getElementById('chatInput');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        // Listen for page changes to update context
        const origNavTo = window.navigateTo;
        if (typeof origNavTo === 'function') {
            window.navigateTo = (page) => {
                origNavTo(page);
                this.bot.currentPage = page;
            };
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        const window_ = document.getElementById('chatbotWindow');
        const toggle = document.getElementById('chatbotToggle');
        if (!window_) return;

        window_.classList.add('open');
        toggle?.classList.add('active');
        this.isOpen = true;
        this.isMinimized = false;

        // Show greeting on first open
        if (!this.hasGreeted) {
            const greeting = this.bot.getGreeting();
            this.appendBotMessage(greeting);
            this.hasGreeted = true;
        }

        // Focus input
        setTimeout(() => {
            document.getElementById('chatInput')?.focus();
        }, 300);
    }

    close() {
        const window_ = document.getElementById('chatbotWindow');
        const toggle = document.getElementById('chatbotToggle');
        if (!window_) return;

        window_.classList.remove('open');
        toggle?.classList.remove('active');
        this.isOpen = false;
    }

    minimize() {
        this.close();
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const text = input?.value?.trim();
        if (!text) return;

        // Show user message
        this.appendUserMessage(text);
        input.value = '';

        // Process and respond with slight delay for natural feel
        setTimeout(() => {
            const response = this.bot.processMessage(text);
            this.appendBotMessage(response);
        }, 300 + Math.random() * 400);
    }

    sendSuggestion(text) {
        const input = document.getElementById('chatInput');
        if (input) input.value = text;
        this.sendMessage();
    }

    appendUserMessage(text) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const msg = document.createElement('div');
        msg.className = 'chat-message user-message';
        msg.innerHTML = `
            <div class="message-bubble user-bubble">
                <div class="message-text">${this.escapeHtml(text)}</div>
            </div>
        `;
        container.appendChild(msg);
        this.scrollToBottom();
    }

    appendBotMessage(response) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const msg = document.createElement('div');
        msg.className = 'chat-message bot-message';

        // Parse markdown-like formatting
        let formattedText = this.formatText(response.text);

        let suggestionsHtml = '';
        if (response.suggestions && response.suggestions.length > 0) {
            suggestionsHtml = `
                <div class="chat-suggestions">
                    ${response.suggestions.map(s =>
                        `<button class="chat-suggestion-btn" onclick="chatbotUI.sendSuggestion('${s.replace(/'/g, "\\'")}')">${s}</button>`
                    ).join('')}
                </div>
            `;
        }

        msg.innerHTML = `
            <div class="message-bubble bot-bubble">
                <div class="message-title">${response.title || ''}</div>
                <div class="message-text">${formattedText}</div>
                ${suggestionsHtml}
            </div>
        `;

        container.appendChild(msg);
        this.scrollToBottom();
    }

    formatText(text) {
        // Bold
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        // Code blocks
        text = text.replace(/```([\s\S]*?)```/g, '<pre class="chat-code">$1</pre>');
        // Tables
        text = this.formatTables(text);
        // Line breaks
        text = text.replace(/\n/g, '<br>');
        return text;
    }

    formatTables(text) {
        const lines = text.split('\n');
        let result = [];
        let inTable = false;
        let tableHtml = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('|') && line.endsWith('|')) {
                if (!inTable) {
                    inTable = true;
                    tableHtml = '<table class="chat-table">';
                }
                // Skip separator rows
                if (line.match(/^\|[\s\-|]+\|$/)) continue;

                const cells = line.split('|').filter(c => c.trim());
                const isHeader = i === 0 || (i > 0 && lines[i-1] && !lines[i-1].trim().startsWith('|'));
                const tag = !tableHtml.includes('<tr>') ? 'th' : 'td';

                tableHtml += '<tr>' + cells.map(c =>
                    `<${tag}>${c.trim().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</${tag}>`
                ).join('') + '</tr>';
            } else {
                if (inTable) {
                    tableHtml += '</table>';
                    result.push(tableHtml);
                    tableHtml = '';
                    inTable = false;
                }
                result.push(line);
            }
        }
        if (inTable) {
            tableHtml += '</table>';
            result.push(tableHtml);
        }
        return result.join('\n');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 50);
        }
    }
}

// ═══ GLOBAL INSTANCE ═══
const chatbotUI = new ChatbotUI();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    chatbotUI.init();
});
