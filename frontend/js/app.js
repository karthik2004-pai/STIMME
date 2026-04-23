/* ═══════════════════════════════════════════════════════════
   STIMME — Main Application Controller
   AI Audio Identifier | Frontend Logic
   ═══════════════════════════════════════════════════════════ */

const API = '';

// ═══ STATE ═══
const state = {
    currentPage: 'identify',
    audioBlob: null,
    audioFile: null,
    isRecording: false,
    mediaRecorder: null,
    audioChunks: [],
    recordTimer: null,
    recordSeconds: 0,
    classes: [],
    categories: [],
    selectedClassId: null,
    selectedTrainClasses: new Set(),
    selectedArchitecture: 'yamnet_transfer',
    isTraining: false,
    trainingPollInterval: null,
};

// ═══ INITIALIZATION ═══
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initUploadZone();
    initRecording();
    initClassManagement();
    initTraining();
    initAnalyzePage();
    initIntelligencePage();
    checkModelStatus();
    loadHistory();
});

// ═══ NAVIGATION ═══
function initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            const page = link.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    state.currentPage = page;

    // Update nav
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.nav-link[data-page="${page}"]`)?.classList.add('active');

    // Show page
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');

    // Load data
    if (page === 'classes') loadClasses();
    if (page === 'train') { loadClasses(); loadArchitectures(); }
    if (page === 'models') loadModels();
    if (page === 'history') loadHistory();
}

// Make navigateTo globally accessible (used by chatbot)
window.navigateTo = navigateTo;

// ═══ MODEL STATUS ═══
async function checkModelStatus() {
    try {
        const res = await fetch(`${API}/api/models/active`);
        const data = await res.json();
        document.getElementById('modelStatus').textContent = `Model: ${data.active_model || 'loading...'}`;
    } catch {
        document.getElementById('modelStatus').textContent = 'Connecting...';
        setTimeout(checkModelStatus, 3000);
    }
}

// ═══ UPLOAD ZONE ═══
function initUploadZone() {
    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('audioFileInput');

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('audio/')) {
            handleAudioFile(file);
        }
    });

    input.addEventListener('change', () => {
        if (input.files[0]) {
            handleAudioFile(input.files[0]);
        }
    });

    document.getElementById('clearAudioBtn').addEventListener('click', clearAudio);
    document.getElementById('identifyBtn').addEventListener('click', identifyAudio);
}

function handleAudioFile(file) {
    state.audioFile = file;
    state.audioBlob = file;

    document.getElementById('audioFileName').textContent = file.name;
    document.getElementById('audioFileMeta').textContent =
        `${(file.size / 1024).toFixed(1)} KB • ${file.type || 'audio'}`;
    document.getElementById('audioPreview').classList.add('visible');
    document.getElementById('identifyBtn').disabled = false;

    // Draw waveform
    const reader = new FileReader();
    reader.onload = (e) => {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.decodeAudioData(e.target.result, (buffer) => {
            drawWaveform(buffer);
            drawSpectrogram(buffer);
            audioCtx.close();
        });
    };
    reader.readAsArrayBuffer(file);
}

function clearAudio() {
    state.audioFile = null;
    state.audioBlob = null;
    document.getElementById('audioPreview').classList.remove('visible');
    document.getElementById('identifyBtn').disabled = true;
    document.getElementById('resultsPanel').classList.remove('visible');
    document.getElementById('identifyEmpty').style.display = '';
    document.getElementById('audioFileInput').value = '';
}

// ═══ AUDIO VISUALIZATION ═══
function drawWaveform(audioBuffer) {
    const canvas = document.getElementById('waveformCanvas');
    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    const width = canvas.parentElement.clientWidth;
    const height = 120;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = 'rgba(6, 6, 11, 0.5)';
    ctx.fillRect(0, 0, width, height);

    // Center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Waveform
    const step = Math.ceil(data.length / width);
    const centerY = height / 2;

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#a78bfa');
    gradient.addColorStop(0.5, '#7c3aed');
    gradient.addColorStop(1, '#a78bfa');

    ctx.fillStyle = gradient;

    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        const y1 = centerY + (min * centerY * 0.9);
        const y2 = centerY + (max * centerY * 0.9);
        ctx.fillRect(i, y1, 1, y2 - y1 || 1);
    }
}

function drawSpectrogram(audioBuffer) {
    const canvas = document.getElementById('spectrogramCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 100;

    canvas.width = width;
    canvas.height = height;

    const data = audioBuffer.getChannelData(0);
    const fftSize = 256;
    const numBins = fftSize / 2;

    // Simple DFT-based spectrogram
    const hopSize = Math.max(1, Math.floor(data.length / width));
    const colors = generateSpectrogramColors();

    for (let x = 0; x < width; x++) {
        const start = x * hopSize;
        const segment = data.slice(start, start + fftSize);

        if (segment.length < fftSize) break;

        // Apply Hanning window and compute magnitude spectrum
        const magnitudes = computeFFTMagnitudes(segment, fftSize);

        for (let y = 0; y < height; y++) {
            const binIdx = Math.floor((y / height) * numBins);
            const mag = magnitudes[binIdx] || 0;
            const colorIdx = Math.min(Math.floor(mag * 10), colors.length - 1);
            ctx.fillStyle = colors[Math.max(0, colorIdx)];
            ctx.fillRect(x, height - y - 1, 1, 1);
        }
    }
}

function computeFFTMagnitudes(segment, fftSize) {
    const magnitudes = [];
    const N = Math.min(segment.length, fftSize);

    for (let k = 0; k < N / 2; k++) {
        let real = 0, imag = 0;
        for (let n = 0; n < N; n++) {
            const hann = 0.5 * (1 - Math.cos(2 * Math.PI * n / N));
            const angle = (2 * Math.PI * k * n) / N;
            real += segment[n] * hann * Math.cos(angle);
            imag -= segment[n] * hann * Math.sin(angle);
        }
        magnitudes.push(Math.sqrt(real * real + imag * imag) / N);
    }
    return magnitudes;
}

function generateSpectrogramColors() {
    const colors = [];
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let r, g, b;
        if (t < 0.25) {
            r = 10; g = 10; b = Math.floor(30 + t * 4 * 100);
        } else if (t < 0.5) {
            r = Math.floor((t - 0.25) * 4 * 124); g = 20; b = 130;
        } else if (t < 0.75) {
            r = 124; g = Math.floor(58 + (t - 0.5) * 4 * 156); b = Math.floor(237 - (t - 0.5) * 4 * 100);
        } else {
            r = Math.floor(124 + (t - 0.75) * 4 * 131); g = 214; b = Math.floor(137 + (t - 0.75) * 4 * 100);
        }
        colors.push(`rgb(${r},${g},${b})`);
    }
    return colors;
}

// ═══ MICROPHONE RECORDING ═══
function initRecording() {
    const btn = document.getElementById('recordBtn');
    btn.addEventListener('click', toggleRecording);
}

async function toggleRecording() {
    if (state.isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        state.mediaRecorder = new MediaRecorder(stream);
        state.audioChunks = [];

        state.mediaRecorder.ondataavailable = (e) => {
            state.audioChunks.push(e.data);
        };

        state.mediaRecorder.onstop = () => {
            const blob = new Blob(state.audioChunks, { type: 'audio/webm' });
            state.audioBlob = blob;
            state.audioFile = new File([blob], 'microphone_recording.webm', { type: 'audio/webm' });

            document.getElementById('audioFileName').textContent = 'Microphone Recording';
            document.getElementById('audioFileMeta').textContent =
                `${(blob.size / 1024).toFixed(1)} KB • ${state.recordSeconds}s • audio/webm`;
            document.getElementById('audioPreview').classList.add('visible');
            document.getElementById('identifyBtn').disabled = false;

            // Draw waveform from recorded audio
            const reader = new FileReader();
            reader.onload = (e) => {
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                audioCtx.decodeAudioData(e.target.result, (buffer) => {
                    drawWaveform(buffer);
                    drawSpectrogram(buffer);
                    audioCtx.close();
                });
            };
            reader.readAsArrayBuffer(blob);

            stream.getTracks().forEach(t => t.stop());
        };

        state.mediaRecorder.start();
        state.isRecording = true;
        state.recordSeconds = 0;

        const btn = document.getElementById('recordBtn');
        btn.classList.add('recording');
        btn.innerHTML = '⏹️';
        document.getElementById('recordLabel').textContent = 'Recording...';
        document.getElementById('recordTimer').classList.add('visible');

        state.recordTimer = setInterval(() => {
            state.recordSeconds++;
            const mins = String(Math.floor(state.recordSeconds / 60)).padStart(2, '0');
            const secs = String(state.recordSeconds % 60).padStart(2, '0');
            document.getElementById('recordTimer').textContent = `${mins}:${secs}`;
        }, 1000);

    } catch (err) {
        showToast('Microphone access denied. Please allow microphone permission.', 'error');
    }
}

function stopRecording() {
    if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.stop();
    }
    state.isRecording = false;
    clearInterval(state.recordTimer);

    const btn = document.getElementById('recordBtn');
    btn.classList.remove('recording');
    btn.innerHTML = '🎙️';
    document.getElementById('recordLabel').textContent = 'Click to record';
    document.getElementById('recordTimer').classList.remove('visible');
}

// ═══ CLASSIFICATION ═══
async function identifyAudio() {
    if (!state.audioBlob) return;

    const btn = document.getElementById('identifyBtn');
    btn.disabled = true;
    btn.classList.add('loading');
    btn.innerHTML = 'Analyzing...';

    document.getElementById('identifyEmpty').style.display = 'none';
    document.getElementById('resultsPanel').classList.remove('visible');

    try {
        const formData = new FormData();
        formData.append('file', state.audioBlob);

        const endpoint = state.audioFile?.name?.includes('microphone')
            ? '/api/classify/record'
            : '/api/classify/upload';

        const res = await fetch(`${API}${endpoint}`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json();
        displayResults(data);
        showToast('Sound identified successfully!', 'success');

    } catch (err) {
        showToast(`Classification failed: ${err.message}`, 'error');
        document.getElementById('identifyEmpty').style.display = '';
    } finally {
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.innerHTML = '🎯 Identify Sound';
    }
}

function displayResults(data) {
    const panel = document.getElementById('resultsPanel');
    panel.classList.add('visible');

    const predictions = data.predictions || [];
    if (predictions.length === 0) {
        document.getElementById('predictionClass').textContent = 'No predictions';
        return;
    }

    const top = predictions[0];

    // Top prediction
    document.getElementById('predictionClass').textContent = top.class;
    document.getElementById('predictionModel').textContent = `via ${top.model || data.model_used}`;
    document.getElementById('predictionIcon').textContent = getIconForClass(top.class);

    // Confidence meter
    const confidence = Math.round(top.confidence * 100);
    document.getElementById('confidenceValue').textContent = `${confidence}%`;
    const circumference = 2 * Math.PI * 50; // r=50
    const offset = circumference - (confidence / 100) * circumference;
    setTimeout(() => {
        document.getElementById('meterFill').style.strokeDashoffset = offset;
    }, 100);

    // Status
    document.getElementById('resultStatusText').textContent =
        confidence > 50 ? 'High Confidence' : confidence > 25 ? 'Medium Confidence' : 'Low Confidence';

    // Prediction list
    const list = document.getElementById('predictionsList');
    list.innerHTML = predictions.slice(0, 8).map((p, i) => `
        <div class="prediction-item">
            <div class="prediction-rank">${i + 1}</div>
            <span class="prediction-name">${p.class}</span>
            <div class="prediction-bar">
                <div class="prediction-bar-fill" style="width:${p.confidence * 100}%"></div>
            </div>
            <span class="prediction-confidence">${(p.confidence * 100).toFixed(1)}%</span>
        </div>
    `).join('');
}

function getIconForClass(className) {
    const lower = className.toLowerCase();
    if (lower.includes('bird') || lower.includes('crow') || lower.includes('sparrow')) return '🐦';
    if (lower.includes('dog') || lower.includes('bark')) return '🐕';
    if (lower.includes('cat') || lower.includes('meow')) return '🐱';
    if (lower.includes('car') || lower.includes('engine') || lower.includes('vehicle')) return '🚗';
    if (lower.includes('truck')) return '🚛';
    if (lower.includes('train')) return '🚂';
    if (lower.includes('airplane') || lower.includes('aircraft')) return '✈️';
    if (lower.includes('helicopter')) return '🚁';
    if (lower.includes('rain') || lower.includes('drizzle')) return '🌧️';
    if (lower.includes('thunder') || lower.includes('storm')) return '⛈️';
    if (lower.includes('wind')) return '💨';
    if (lower.includes('music') || lower.includes('piano') || lower.includes('guitar')) return '🎵';
    if (lower.includes('drum')) return '🥁';
    if (lower.includes('speech') || lower.includes('talk') || lower.includes('voice')) return '🗣️';
    if (lower.includes('laugh')) return '😄';
    if (lower.includes('clap') || lower.includes('applause')) return '👏';
    if (lower.includes('knock')) return '🚪';
    if (lower.includes('phone') || lower.includes('ring')) return '📱';
    if (lower.includes('siren')) return '🚨';
    if (lower.includes('water') || lower.includes('ocean') || lower.includes('wave')) return '🌊';
    if (lower.includes('forest') || lower.includes('nature')) return '🌿';
    if (lower.includes('fire') || lower.includes('explosion')) return '🔥';
    if (lower.includes('horn')) return '📯';
    return '🔊';
}

// ═══ CLASS MANAGEMENT ═══
function initClassManagement() {
    document.getElementById('createClassBtn').addEventListener('click', () => {
        document.getElementById('createClassModal').classList.add('visible');
    });

    document.getElementById('cancelCreateClass').addEventListener('click', () => {
        document.getElementById('createClassModal').classList.remove('visible');
    });

    document.getElementById('confirmCreateClass').addEventListener('click', createNewClass);

    document.getElementById('backToClassesBtn').addEventListener('click', () => {
        document.getElementById('classDetailPanel').classList.remove('visible');
        document.getElementById('classesView').style.display = '';
    });

    // Sample upload
    const sampleZone = document.getElementById('sampleUploadZone');
    const sampleInput = document.getElementById('sampleFileInput');

    sampleZone.addEventListener('click', () => sampleInput.click());
    sampleZone.addEventListener('dragover', (e) => e.preventDefault());
    sampleZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadSamples(e.dataTransfer.files);
    });
    sampleInput.addEventListener('change', () => {
        if (sampleInput.files.length > 0) {
            uploadSamples(sampleInput.files);
        }
    });

    document.getElementById('deleteClassBtn').addEventListener('click', deleteSelectedClass);

    // Close modal on overlay click
    document.getElementById('createClassModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            e.currentTarget.classList.remove('visible');
        }
    });

    // Class search — initialize ONCE here (not inside renderClassesGrid)
    document.getElementById('classSearch').addEventListener('input', () => {
        const activeTab = document.querySelector('.category-tab.active');
        renderClassesGrid(activeTab?.dataset.category || 'all');
    });
}

async function loadClasses() {
    try {
        const res = await fetch(`${API}/api/classes`);
        const data = await res.json();
        state.classes = data.classes || [];
        state.categories = data.categories || [];
        renderCategoryTabs();
        renderClassesGrid();
        if (state.currentPage === 'train') renderTrainClassSelector();
    } catch (err) {
        console.error('Failed to load classes:', err);
    }
}

function renderCategoryTabs() {
    const container = document.getElementById('categoryTabs');
    const categories = [...new Set(state.classes.map(c => c.category))];

    container.innerHTML = `
        <button class="category-tab active" data-category="all">All (${state.classes.length})</button>
        ${categories.map(cat => {
        const count = state.classes.filter(c => c.category === cat).length;
        const icon = getCategoryIcon(cat);
        return `<button class="category-tab" data-category="${cat}">${icon} ${cat} (${count})</button>`;
    }).join('')}
    `;

    container.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            container.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderClassesGrid(tab.dataset.category);
        });
    });
}

function renderClassesGrid(filterCategory = 'all') {
    const grid = document.getElementById('classesGrid');
    const search = document.getElementById('classSearch').value.toLowerCase();

    let filtered = state.classes;
    if (filterCategory !== 'all') {
        filtered = filtered.filter(c => c.category === filterCategory);
    }
    if (search) {
        filtered = filtered.filter(c =>
            c.name.toLowerCase().includes(search) || c.category.toLowerCase().includes(search)
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="empty-icon">📂</div>
                <div class="empty-title">No classes found</div>
                <div class="empty-desc">Create a new class to get started</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(c => `
        <div class="glass-card class-card" data-id="${c.id}">
            <div class="class-icon">${c.icon || '🔊'}</div>
            <div class="class-name">${c.name}</div>
            <div class="class-category">${c.category}</div>
            <div class="class-samples">
                Samples: <span class="sample-count">${c.sample_count}</span>
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.class-card').forEach(card => {
        card.addEventListener('click', () => openClassDetail(parseInt(card.dataset.id)));
    });
}

function getCategoryIcon(category) {
    const icons = {
        'Birds': '🐦', 'Vehicles': '🚗', 'Weather': '🌧️', 'Music': '🎵',
        'Human': '🗣️', 'Nature': '🌿', 'Urban': '🏙️', 'Custom': '⚡'
    };
    return icons[category] || '📁';
}

async function openClassDetail(classId) {
    const cls = state.classes.find(c => c.id === classId);
    if (!cls) return;

    state.selectedClassId = classId;
    document.getElementById('classesView').style.display = 'none';
    document.getElementById('classDetailPanel').classList.add('visible');
    document.getElementById('detailIcon').textContent = cls.icon || '🔊';
    document.getElementById('detailName').textContent = cls.name;
    document.getElementById('detailCategory').textContent = cls.category;

    await loadClassSamples(classId);
}

async function loadClassSamples(classId) {
    try {
        const res = await fetch(`${API}/api/classes/${classId}/samples`);
        const data = await res.json();
        const samples = data.samples || [];

        document.getElementById('sampleCount').textContent = samples.length;

        if (samples.length === 0) {
            document.getElementById('samplesList').innerHTML = `
                <div class="empty-state" style="grid-column:1/-1;">
                    <div class="empty-icon">📤</div>
                    <div class="empty-title">No samples yet</div>
                    <div class="empty-desc">Upload audio files to build the training dataset</div>
                </div>
            `;
            return;
        }

        document.getElementById('samplesList').innerHTML = samples.map(s => `
            <div class="sample-item">
                <span>🎵</span>
                <span class="sample-name" title="${s.original_name || s.filename}">${s.original_name || s.filename}</span>
                <span class="sample-duration">${s.duration}s</span>
                <span class="sample-delete" onclick="deleteSample(${s.id})" title="Delete">✕</span>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load samples:', err);
    }
}

async function uploadSamples(files) {
    if (!state.selectedClassId) return;

    const formData = new FormData();
    for (const file of files) {
        formData.append('files', file);
    }

    try {
        const res = await fetch(`${API}/api/classes/${state.selectedClassId}/samples`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Upload failed');

        showToast(`Uploaded ${files.length} sample(s) successfully!`, 'success');
        await loadClassSamples(state.selectedClassId);
        loadClasses();  // refresh counts
    } catch (err) {
        showToast(`Upload failed: ${err.message}`, 'error');
    }

    document.getElementById('sampleFileInput').value = '';
}

async function deleteSample(sampleId) {
    try {
        await fetch(`${API}/api/classes/samples/${sampleId}`, { method: 'DELETE' });
        showToast('Sample deleted', 'info');
        await loadClassSamples(state.selectedClassId);
        loadClasses();
    } catch (err) {
        showToast('Failed to delete sample', 'error');
    }
}

async function createNewClass() {
    const name = document.getElementById('newClassName').value.trim();
    const category = document.getElementById('newClassCategory').value;
    const description = document.getElementById('newClassDesc').value.trim();

    if (!name) {
        showToast('Please enter a class name', 'error');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('name', name);
        formData.append('category', category);
        formData.append('description', description);

        const res = await fetch(`${API}/api/classes`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        showToast(`Class "${name}" created!`, 'success');
        document.getElementById('createClassModal').classList.remove('visible');
        document.getElementById('newClassName').value = '';
        document.getElementById('newClassDesc').value = '';
        loadClasses();
    } catch (err) {
        showToast(`Failed: ${err.message}`, 'error');
    }
}

async function deleteSelectedClass() {
    if (!state.selectedClassId) return;
    if (!confirm('Are you sure? This will delete the class and all its samples.')) return;

    try {
        await fetch(`${API}/api/classes/${state.selectedClassId}`, { method: 'DELETE' });
        showToast('Class deleted', 'info');
        document.getElementById('classDetailPanel').classList.remove('visible');
        document.getElementById('classesView').style.display = '';
        state.selectedClassId = null;
        loadClasses();
    } catch (err) {
        showToast('Failed to delete class', 'error');
    }
}

// ═══ TRAINING ═══
function initTraining() {
    document.getElementById('startTrainingBtn').addEventListener('click', startTraining);
}

function renderTrainClassSelector() {
    const container = document.getElementById('trainClassSelector');
    const classesWithSamples = state.classes.filter(c => c.sample_count > 0);

    if (classesWithSamples.length === 0) {
        container.innerHTML = `
            <div style="color:var(--text-muted); font-size:0.85rem; grid-column:1/-1;">
                No classes with audio samples. Upload samples first in the Classes section.
            </div>
        `;
        return;
    }

    container.innerHTML = classesWithSamples.map(c => `
        <label class="class-checkbox ${state.selectedTrainClasses.has(c.id) ? 'selected' : ''}" data-id="${c.id}">
            <input type="checkbox" ${state.selectedTrainClasses.has(c.id) ? 'checked' : ''}>
            ${c.icon} ${c.name} (${c.sample_count})
        </label>
    `).join('');

    container.querySelectorAll('.class-checkbox').forEach(cb => {
        cb.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') return; // let checkbox handle
            const input = cb.querySelector('input');
            input.checked = !input.checked;
        });

        cb.querySelector('input').addEventListener('change', (e) => {
            const id = parseInt(cb.dataset.id);
            if (e.target.checked) {
                state.selectedTrainClasses.add(id);
                cb.classList.add('selected');
            } else {
                state.selectedTrainClasses.delete(id);
                cb.classList.remove('selected');
            }
        });
    });
}

async function loadArchitectures() {
    try {
        const res = await fetch(`${API}/api/models`);
        const data = await res.json();
        const archs = data.architectures || [];
        renderArchSelector(archs);
    } catch {
        renderArchSelector([
            { id: 'yamnet_transfer', name: 'YAMNet Transfer Learning', description: 'Fast and accurate', recommended: true, training_time: '~1-2 min', min_samples: 10 },
            { id: 'custom_cnn', name: 'Custom CNN', description: 'Trains from scratch', recommended: false, training_time: '~5-10 min', min_samples: 50 }
        ]);
    }
}

function renderArchSelector(architectures) {
    const container = document.getElementById('archSelector');
    container.innerHTML = architectures.map(a => `
        <div class="arch-option ${a.id === state.selectedArchitecture ? 'selected' : ''}" data-arch="${a.id}">
            <div class="arch-name">${a.name}</div>
            <div class="arch-desc">${a.description}</div>
            <div style="display:flex; gap:8px; margin-top:6px;">
                ${a.recommended ? '<span class="arch-badge recommended">Recommended</span>' : ''}
                <span style="font-size:0.7rem; color:var(--text-muted);">⏱️ ${a.training_time} • min ${a.min_samples} samples</span>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.arch-option').forEach(opt => {
        opt.addEventListener('click', () => {
            container.querySelectorAll('.arch-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            state.selectedArchitecture = opt.dataset.arch;
        });
    });
}

async function startTraining() {
    if (state.selectedTrainClasses.size < 2) {
        showToast('Select at least 2 classes for training', 'error');
        return;
    }

    const classIds = Array.from(state.selectedTrainClasses).join(',');
    const modelName = document.getElementById('trainModelName').value.trim();
    const epochs = document.getElementById('trainEpochs').value;

    const btn = document.getElementById('startTrainingBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Training...';

    document.getElementById('trainingProgress').classList.add('visible');
    document.getElementById('trainEmpty').style.display = 'none';

    try {
        const formData = new FormData();
        formData.append('class_ids', classIds);
        formData.append('architecture', state.selectedArchitecture);
        formData.append('epochs', epochs);
        if (modelName) formData.append('model_name', modelName);

        const res = await fetch(`${API}/api/training/start`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();

        if (data.error) {
            showToast(`Training failed: ${data.error}`, 'error');
        } else if (data.success) {
            showToast(`Training complete! Accuracy: ${(data.accuracy * 100).toFixed(1)}%`, 'success');
            document.getElementById('trainProgressBar').style.width = '100%';
            document.getElementById('trainMessage').textContent = 'Training Complete! ✓';
            document.getElementById('trainAccStat').textContent = `${(data.accuracy * 100).toFixed(1)}%`;
            document.getElementById('trainValAccStat').textContent = `${(data.val_accuracy * 100).toFixed(1)}%`;
            document.getElementById('trainEpochStat').textContent = `${data.epochs_trained}`;
        }
    } catch (err) {
        showToast(`Training error: ${err.message}`, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Start Training';
    }
}

// ═══ MODELS ═══
async function loadModels() {
    try {
        const res = await fetch(`${API}/api/models`);
        const data = await res.json();
        renderModelsGrid(data.models || []);
    } catch (err) {
        console.error('Failed to load models:', err);
    }
}

function renderModelsGrid(models) {
    const grid = document.getElementById('modelsGrid');

    if (models.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="empty-icon">⚡</div>
                <div class="empty-title">No models available</div>
                <div class="empty-desc">The YAMNet model will load when the server starts</div>
            </div>
        `;
        return;
    }

    grid.innerHTML = models.map(m => `
        <div class="glass-card model-card ${m.is_active ? 'active-model' : ''}">
            ${m.is_active ? '<div class="active-badge">● Active</div>' : ''}
            <div class="model-arch">${m.architecture}</div>
            <div class="model-name">${m.name}</div>
            <div class="model-desc">${m.description}</div>
            <div class="model-stats">
                <div class="model-stat-item">
                    <div class="label">Classes</div>
                    <div class="value">${m.classes}</div>
                </div>
                <div class="model-stat-item">
                    <div class="label">Status</div>
                    <div class="value">${m.status}</div>
                </div>
            </div>
            ${!m.is_active ? `<button class="btn btn-ghost btn-sm" onclick="activateModel('${m.name}')">Activate</button>` : ''}
        </div>
    `).join('');
}

async function activateModel(modelName) {
    try {
        const res = await fetch(`${API}/api/models/${modelName}/activate`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showToast(`Model "${modelName}" activated!`, 'success');
            loadModels();
            checkModelStatus();
        } else {
            showToast(`Failed: ${data.error}`, 'error');
        }
    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

// ═══ HISTORY ═══
async function loadHistory() {
    try {
        const res = await fetch(`${API}/api/classify/history`);
        const data = await res.json();
        renderHistory(data);
    } catch (err) {
        console.error('Failed to load history:', err);
    }
}

function renderHistory(entries) {
    const body = document.getElementById('historyBody');
    const empty = document.getElementById('historyEmpty');

    if (!entries || entries.length === 0) {
        body.innerHTML = '';
        empty.style.display = '';
        return;
    }

    empty.style.display = 'none';
    body.innerHTML = entries.map(e => {
        const time = e.timestamp ? new Date(e.timestamp).toLocaleString() : '—';
        return `
            <tr>
                <td style="font-size:0.8rem; color:var(--text-muted);">${time}</td>
                <td><span class="history-source">${e.source === 'upload' ? '📁' : '🎙️'} ${e.source}</span></td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis;">${e.filename || '—'}</td>
                <td style="font-weight:600;">${getIconForClass(e.predicted_class)} ${e.predicted_class}</td>
                <td style="font-family:'JetBrains Mono',monospace; font-size:0.85rem;">
                    <span style="color:${e.confidence > 0.5 ? 'var(--accent)' : 'var(--amber)'}">
                        ${(e.confidence * 100).toFixed(1)}%
                    </span>
                </td>
                <td style="font-size:0.8rem; color:var(--text-muted);">${e.model_used}</td>
            </tr>
        `;
    }).join('');
}

// ═══ ANALYZE PAGE — Frequency Spectrum Analyzer ═══
const analyzeState = {
    audioCtx: null,
    source: null,
    analyser: null,
    gainNode: null,
    audioBuffer: null,
    isPlaying: false,
    animFrameId: null,
    startTime: 0,
    pauseOffset: 0,
    peaks: [],
};

function initAnalyzePage() {
    const zone = document.getElementById('analyzeUploadZone');
    const input = document.getElementById('analyzeFileInput');

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--cyan)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.borderColor = '';
        if (e.dataTransfer.files[0]) handleAnalyzeFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => { if (input.files[0]) handleAnalyzeFile(input.files[0]); });

    document.getElementById('clearAnalyzeBtn').addEventListener('click', clearAnalyze);
    document.getElementById('azPlayBtn').addEventListener('click', toggleAnalyzePlayback);
    document.getElementById('azVolumeBar').addEventListener('input', (e) => {
        if (analyzeState.gainNode) analyzeState.gainNode.gain.value = e.target.value / 100;
    });
    document.getElementById('azSeekBar').addEventListener('input', seekAnalyze);
}

async function handleAnalyzeFile(file) {
    // Show content, hide upload zone
    document.getElementById('analyzeUploadZone').style.display = 'none';
    document.getElementById('analyzeContent').classList.add('visible');
    document.getElementById('azFileName').textContent = file.name;

    // Decode audio for Web Audio API playback
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    analyzeState.audioCtx = audioCtx;
    analyzeState.audioBuffer = audioBuffer;
    analyzeState.pauseOffset = 0;

    // Setup analyser
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    analyzeState.analyser = analyser;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = document.getElementById('azVolumeBar').value / 100;
    analyzeState.gainNode = gainNode;

    // Display duration
    const dur = audioBuffer.duration;
    document.getElementById('azDuration').textContent = formatTime(dur);
    document.getElementById('azTotalTime').textContent = formatTime(dur);
    document.getElementById('azSampleRate').textContent = audioBuffer.sampleRate + ' Hz';

    // Draw static waveform
    drawAnalyzeWaveform(audioBuffer);

    // Draw static spectrogram heatmap
    drawHeatmap(audioBuffer);

    // Initialize peaks array for FFT
    analyzeState.peaks = new Array(analyser.frequencyBinCount).fill(0);

    // Send to backend for frequency analysis
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`${API}/api/analyze/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        displayAnalyzeData(data);
    } catch (err) {
        console.error('Analyze API error:', err);
    }
}

function displayAnalyzeData(data) {
    const fa = data.frequency_analysis;
    const ai = data.audio_info;

    // Info bar
    document.getElementById('azDominantFreq').textContent = fa.dominant_frequency_hz + ' Hz';
    document.getElementById('azCentroid').textContent = Math.round(fa.spectral_centroid_hz) + ' Hz';

    // Spectral stats
    document.getElementById('azStatCentroid').textContent = Math.round(fa.spectral_centroid_hz) + ' Hz';
    document.getElementById('azStatRolloff').textContent = Math.round(fa.spectral_rolloff_hz) + ' Hz';
    document.getElementById('azStatFlatness').textContent = fa.spectral_flatness.toFixed(4);
    document.getElementById('azStatDominant').textContent = fa.dominant_frequency_hz + ' Hz';
    document.getElementById('azStatRMS').textContent = ai.rms_level.toFixed(4);
    document.getElementById('azStatPeak').textContent = ai.peak_level.toFixed(4);

    // Frequency bands
    const bands = fa.bands;
    const maxEnergy = Math.max(...Object.values(bands).map(b => b.energy), 1e-10);
    for (const [name, info] of Object.entries(bands)) {
        const pct = Math.min(100, (info.energy / maxEnergy) * 100);
        const el = document.getElementById(`band_${name}`);
        const dbEl = document.getElementById(`db_${name}`);
        if (el) el.style.width = pct + '%';
        if (dbEl) dbEl.textContent = info.peak_db + ' dB';
    }
}

function drawAnalyzeWaveform(audioBuffer) {
    const canvas = document.getElementById('azWaveformCanvas');
    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    const width = canvas.parentElement.clientWidth;
    const height = 100;
    canvas.width = width; canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(6,6,11,0.5)'; ctx.fillRect(0, 0, width, height);

    const step = Math.ceil(data.length / width);
    const centerY = height / 2;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#22d3ee'); gradient.addColorStop(0.5, '#06d6a0'); gradient.addColorStop(1, '#22d3ee');
    ctx.fillStyle = gradient;

    for (let i = 0; i < width; i++) {
        let min = 1, max = -1;
        for (let j = 0; j < step; j++) {
            const d = data[i * step + j];
            if (d < min) min = d; if (d > max) max = d;
        }
        ctx.fillRect(i, centerY + min * centerY * 0.9, 1, (max - min) * centerY * 0.9 || 1);
    }
}

function drawHeatmap(audioBuffer) {
    const canvas = document.getElementById('heatmapCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 150;
    canvas.width = width; canvas.height = height;

    const data = audioBuffer.getChannelData(0);
    const fftSize = 512;
    const numBins = fftSize / 2;
    const hopSize = Math.max(1, Math.floor(data.length / width));
    const colors = generateSpectrogramColors();

    for (let x = 0; x < width; x++) {
        const start = x * hopSize;
        const segment = data.slice(start, start + fftSize);
        if (segment.length < fftSize) break;
        const mags = computeFFTMagnitudes(segment, fftSize);
        for (let y = 0; y < height; y++) {
            const binIdx = Math.floor((y / height) * numBins);
            const mag = mags[binIdx] || 0;
            const ci = Math.min(Math.floor(mag * 15), colors.length - 1);
            ctx.fillStyle = colors[Math.max(0, ci)];
            ctx.fillRect(x, height - y - 1, 1, 1);
        }
    }
}

function toggleAnalyzePlayback() {
    if (analyzeState.isPlaying) {
        stopAnalyzePlayback();
    } else {
        startAnalyzePlayback();
    }
}

function startAnalyzePlayback() {
    if (!analyzeState.audioBuffer || !analyzeState.audioCtx) return;
    const ctx = analyzeState.audioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const source = ctx.createBufferSource();
    source.buffer = analyzeState.audioBuffer;
    source.connect(analyzeState.analyser);
    analyzeState.analyser.connect(analyzeState.gainNode);
    analyzeState.gainNode.connect(ctx.destination);

    source.start(0, analyzeState.pauseOffset);
    analyzeState.source = source;
    analyzeState.startTime = ctx.currentTime - analyzeState.pauseOffset;
    analyzeState.isPlaying = true;

    document.getElementById('azPlayBtn').textContent = '⏸️';
    document.getElementById('azPlayBtn').classList.add('playing');
    document.getElementById('azLiveBadge').style.display = '';

    source.onended = () => {
        if (analyzeState.isPlaying) {
            analyzeState.pauseOffset = 0;
            stopAnalyzePlayback();
        }
    };

    renderFFTLoop();
}

function stopAnalyzePlayback() {
    if (analyzeState.source) {
        try { analyzeState.source.stop(); } catch (e) { }
    }
    if (analyzeState.isPlaying && analyzeState.audioCtx) {
        analyzeState.pauseOffset = analyzeState.audioCtx.currentTime - analyzeState.startTime;
    }
    analyzeState.isPlaying = false;
    if (analyzeState.animFrameId) cancelAnimationFrame(analyzeState.animFrameId);

    document.getElementById('azPlayBtn').textContent = '▶️';
    document.getElementById('azPlayBtn').classList.remove('playing');
    document.getElementById('azLiveBadge').style.display = 'none';
}

function seekAnalyze() {
    if (!analyzeState.audioBuffer) return;
    const pct = document.getElementById('azSeekBar').value / 100;
    analyzeState.pauseOffset = pct * analyzeState.audioBuffer.duration;
    if (analyzeState.isPlaying) {
        stopAnalyzePlayback();
        startAnalyzePlayback();
    }
}

function renderFFTLoop() {
    if (!analyzeState.isPlaying) return;
    analyzeState.animFrameId = requestAnimationFrame(renderFFTLoop);

    const analyser = analyzeState.analyser;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // Draw FFT bars
    const canvas = document.getElementById('fftCanvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 200;
    canvas.width = width; canvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(6,6,11,0.3)';
    ctx.fillRect(0, 0, width, height);

    const barCount = 128;
    const barWidth = (width / barCount) - 1;
    const binStep = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < binStep; j++) {
            sum += dataArray[i * binStep + j];
        }
        const avg = sum / binStep;
        const barHeight = (avg / 255) * height * 0.9;

        // Peak hold
        if (!analyzeState.peaks[i]) analyzeState.peaks[i] = 0;
        if (barHeight > analyzeState.peaks[i]) analyzeState.peaks[i] = barHeight;
        else analyzeState.peaks[i] *= 0.98;

        const x = i * (barWidth + 1);
        const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
        const t = i / barCount;
        if (t < 0.2) { gradient.addColorStop(0, '#7c3aed'); gradient.addColorStop(1, '#a78bfa'); }
        else if (t < 0.4) { gradient.addColorStop(0, '#6366f1'); gradient.addColorStop(1, '#22d3ee'); }
        else if (t < 0.6) { gradient.addColorStop(0, '#06d6a0'); gradient.addColorStop(1, '#34d399'); }
        else if (t < 0.8) { gradient.addColorStop(0, '#fbbf24'); gradient.addColorStop(1, '#f59e0b'); }
        else { gradient.addColorStop(0, '#f472b6'); gradient.addColorStop(1, '#fb7185'); }

        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);

        // Peak marker
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(x, height - analyzeState.peaks[i] - 2, barWidth, 2);
    }

    // Update time
    if (analyzeState.audioCtx && analyzeState.audioBuffer) {
        const elapsed = analyzeState.audioCtx.currentTime - analyzeState.startTime;
        const dur = analyzeState.audioBuffer.duration;
        document.getElementById('azCurrentTime').textContent = formatTime(elapsed);
        document.getElementById('azSeekBar').value = Math.min(100, (elapsed / dur) * 100);
    }
}

function clearAnalyze() {
    stopAnalyzePlayback();
    if (analyzeState.audioCtx) { analyzeState.audioCtx.close(); analyzeState.audioCtx = null; }
    analyzeState.audioBuffer = null;
    analyzeState.pauseOffset = 0;
    document.getElementById('analyzeContent').classList.remove('visible');
    document.getElementById('analyzeUploadZone').style.display = '';
    document.getElementById('analyzeFileInput').value = '';
}

function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

// ═══ INTELLIGENCE PAGE ═══
const intelState = {
    currentTab: 'forensics',
    audioFile: null,
    enhancedAudioBase64: null,
};

function initIntelligencePage() {
    // Tab switching
    document.querySelectorAll('.intel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.intel-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            intelState.currentTab = tab.dataset.intel;
            document.querySelectorAll('.intel-panel').forEach(p => p.classList.remove('visible'));
            // Re-run analysis if file loaded
            if (intelState.audioFile) runIntelAnalysis(intelState.currentTab);
        });
    });

    // Upload zone
    const zone = document.getElementById('intelUploadZone');
    const input = document.getElementById('intelFileInput');
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--primary)'; });
    zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
    zone.addEventListener('drop', (e) => {
        e.preventDefault(); zone.style.borderColor = '';
        if (e.dataTransfer.files[0]) handleIntelFile(e.dataTransfer.files[0]);
    });
    input.addEventListener('change', () => { if (input.files[0]) handleIntelFile(input.files[0]); });

    // Download enhanced
    document.getElementById('downloadEnhancedBtn').addEventListener('click', downloadEnhanced);
}

async function handleIntelFile(file) {
    intelState.audioFile = file;
    document.getElementById('intelUploadZone').classList.add('hidden');
    runIntelAnalysis(intelState.currentTab);
}

async function runIntelAnalysis(type) {
    if (!intelState.audioFile) return;

    // Show processing
    document.querySelectorAll('.intel-panel').forEach(p => p.classList.remove('visible'));
    document.getElementById('intelProcessing').classList.add('visible');

    const endpoints = {
        forensics: '/api/intel/forensics',
        speakers: '/api/intel/speakers',
        steg: '/api/intel/steganalysis',
        threats: '/api/intel/threats',
        enhance: '/api/intel/enhance',
    };

    const processingTexts = {
        forensics: 'Running forensic analysis... Checking for splices, ENF, compression artifacts...',
        speakers: 'Diarizing speakers... Extracting voice embeddings and clustering...',
        steg: 'Scanning for hidden data... LSB analysis, chi-square, phase detection...',
        threats: 'Detecting threats... Analyzing transients and spectral profiles...',
        enhance: 'Enhancing audio... Spectral gating, bandpass filtering...',
    };

    document.getElementById('intelProcessingText').textContent = processingTexts[type] || 'Analyzing...';

    try {
        const formData = new FormData();
        formData.append('file', intelState.audioFile);
        const res = await fetch(`${API}${endpoints[type]}`, { method: 'POST', body: formData });
        const data = await res.json();

        document.getElementById('intelProcessing').classList.remove('visible');

        if (type === 'forensics') renderForensics(data);
        else if (type === 'speakers') renderSpeakers(data);
        else if (type === 'steg') renderSteg(data);
        else if (type === 'threats') renderThreats(data);
        else if (type === 'enhance') renderEnhance(data);

    } catch (err) {
        document.getElementById('intelProcessing').classList.remove('visible');
        showToast(`Intel analysis failed: ${err.message}`, 'error');
    }
}

// ─── Forensics Rendering ───
function renderForensics(data) {
    const panel = document.getElementById('panel-forensics');
    panel.classList.add('visible');

    const verdict = document.getElementById('forensicsVerdict');
    verdict.className = `forensics-verdict glass-card verdict-${data.threat_level}`;
    document.getElementById('forensicsVerdictIcon').textContent = data.threat_level === 'clean' ? '✅' : data.threat_level === 'warning' ? '⚠️' : '🚨';
    document.getElementById('forensicsVerdictText').textContent = data.verdict;
    document.getElementById('forensicsScore').textContent = Math.round(data.tampering_probability * 100) + '%';

    const grid = document.getElementById('forensicsGrid');
    const analyses = data.analyses;
    const cards = [
        { title: '✂️ Splice Detection', score: analyses.splice_detection.splice_score, method: analyses.splice_detection.method, detail: `${analyses.splice_detection.total_discontinuities} discontinuities found` },
        { title: '⚡ ENF Analysis', score: analyses.enf_analysis.enf_anomaly_score, method: analyses.enf_analysis.method, detail: 'Power line frequency consistency' },
        { title: '📦 Compression', score: analyses.compression_analysis.recompression_score, method: analyses.compression_analysis.method, detail: `Cutoff: ${analyses.compression_analysis.frequency_cutoff_hz} Hz` },
        { title: '📊 Noise Floor', score: analyses.noise_floor_analysis.inconsistency_score, method: analyses.noise_floor_analysis.method, detail: `${analyses.noise_floor_analysis.segments.length} segments analyzed` },
        { title: '🧮 Statistical', score: analyses.statistical_analysis.anomaly_score, method: analyses.statistical_analysis.method, detail: `Kurtosis: ${analyses.statistical_analysis.kurtosis}` },
    ];

    grid.innerHTML = cards.map(c => {
        const pct = Math.round(c.score * 100);
        const level = pct < 30 ? 'low' : pct < 60 ? 'medium' : 'high';
        return `<div class="forensics-card">
            <h4>${c.title}</h4>
            <div class="score-bar"><div class="score-bar-fill ${level}" style="width:${pct}%"></div></div>
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-primary);">${pct}%</div>
            <div class="detail">${c.method}</div>
            <div class="detail">${c.detail}</div>
        </div>`;
    }).join('');
}

// ─── Speakers Rendering ───
function renderSpeakers(data) {
    const panel = document.getElementById('panel-speakers');
    panel.classList.add('visible');

    document.getElementById('speakersCount').textContent = data.num_speakers;

    // Timeline
    const timeline = document.getElementById('speakerTimeline');
    const duration = data.duration || 1;
    timeline.innerHTML = data.timeline.map(t => {
        const left = (t.start / duration) * 100;
        const width = Math.max(1, ((t.end - t.start) / duration) * 100);
        return `<div class="timeline-block" style="left:${left}%;width:${width}%;background:${t.color};" title="${t.speaker}: ${t.start}s - ${t.end}s">${t.speaker.replace('Speaker ', 'S')}</div>`;
    }).join('');

    // Stats
    const statsDiv = document.getElementById('speakerStats');
    const colors = ['#7c3aed', '#06d6a0', '#22d3ee', '#fbbf24', '#f472b6', '#fb7185'];
    statsDiv.innerHTML = Object.entries(data.speaker_stats).map(([name, time], i) =>
        `<div class="speaker-stat-item">
            <div class="speaker-color-dot" style="background:${colors[i % colors.length]}"></div>
            <span class="speaker-stat-name">${name}</span>
            <span class="speaker-stat-time">${time}s</span>
        </div>`
    ).join('');
}

// ─── Steganography Rendering ───
function renderSteg(data) {
    const panel = document.getElementById('panel-steg');
    panel.classList.add('visible');

    const verdict = document.getElementById('stegVerdict');
    verdict.className = `steg-verdict glass-card verdict-${data.threat_level}`;
    document.getElementById('stegVerdictIcon').textContent = data.threat_level === 'clean' ? '✅' : data.threat_level === 'warning' ? '⚠️' : '🚨';
    document.getElementById('stegVerdictText').textContent = data.verdict;
    document.getElementById('stegScore').textContent = Math.round(data.steg_probability * 100) + '%';

    const grid = document.getElementById('stegGrid');
    const a = data.analyses;
    const cards = [
        { title: '🔢 LSB Analysis', score: a.lsb_analysis.lsb_score, method: a.lsb_analysis.method, detail: `Ones ratio: ${a.lsb_analysis.ones_ratio}` },
        { title: '📈 Chi-Square', score: a.chi_square_test.chi_score, method: a.chi_square_test.method, detail: `Pair balance: ${a.chi_square_test.avg_pair_balance}` },
        { title: '📡 Spectral Spread', score: a.spectral_spread.spread_score, method: a.spectral_spread.method, detail: `Flatness: ${a.spectral_spread.spectral_flatness}` },
        { title: '🔄 Phase Analysis', score: a.phase_analysis.phase_score, method: a.phase_analysis.method, detail: `Jump ratio: ${a.phase_analysis.phase_jump_ratio}` },
        { title: '🔊 Echo Hiding', score: a.echo_hiding.echo_score, method: a.echo_hiding.method, detail: `Max echo: ${a.echo_hiding.max_echo_correlation}` },
    ];

    grid.innerHTML = cards.map(c => {
        const pct = Math.round(c.score * 100);
        const level = pct < 30 ? 'low' : pct < 60 ? 'medium' : 'high';
        return `<div class="steg-card">
            <h4>${c.title}</h4>
            <div class="score-bar"><div class="score-bar-fill ${level}" style="width:${pct}%"></div></div>
            <div style="font-size:0.8rem;font-weight:700;color:var(--text-primary);">${pct}%</div>
            <div class="detail">${c.method}</div>
            <div class="detail">${c.detail}</div>
        </div>`;
    }).join('');
}

// ─── Threats Rendering ───
function renderThreats(data) {
    const panel = document.getElementById('panel-threats');
    panel.classList.add('visible');

    const card = document.getElementById('threatLevelCard');
    card.className = `threat-level-card glass-card threat-${data.overall_threat}`;

    const icons = { CLEAR: '✅', MEDIUM: '⚠️', HIGH: '🔶', CRITICAL: '🚨' };
    document.getElementById('threatLevelIcon').textContent = icons[data.overall_threat] || '✅';
    document.getElementById('threatLevelText').textContent = data.overall_threat;
    document.getElementById('threatEventCount').textContent = data.total_events;

    const eventsDiv = document.getElementById('threatEvents');
    if (data.events.length === 0) {
        eventsDiv.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:var(--space-xl);">No threat events detected — audio is clear ✅</div>';
    } else {
        eventsDiv.innerHTML = data.events.map(e => `
            <div class="threat-event-item">
                <div class="threat-event-icon">${e.icon}</div>
                <div class="threat-event-info">
                    <div class="threat-event-type">${e.type.replace(/_/g, ' ')}</div>
                    <div class="threat-event-time">@ ${e.time}s</div>
                </div>
                <div class="threat-event-confidence severity-${e.severity}">${Math.round(e.confidence * 100)}%</div>
            </div>
        `).join('');
    }
}

// ─── Enhance Rendering ───
function renderEnhance(data) {
    const panel = document.getElementById('panel-enhance');
    panel.classList.add('visible');

    const m = data.metrics;
    document.getElementById('enhBeforeSNR').textContent = m.before_snr_db + ' dB';
    document.getElementById('enhAfterSNR').textContent = m.after_snr_db + ' dB';
    document.getElementById('enhImprovement').textContent = '+' + m.snr_improvement_db + ' dB';

    // Draw waveforms
    drawEnhanceWaveform('enhBeforeCanvas', data.visualization.before_waveform, '#7c3aed');
    drawEnhanceWaveform('enhAfterCanvas', data.visualization.after_waveform, '#06d6a0');

    // Store enhanced audio for download
    intelState.enhancedAudioBase64 = data.enhanced_audio_base64;
    document.getElementById('downloadEnhancedBtn').style.display = '';
}

function drawEnhanceWaveform(canvasId, waveformData, color) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 80;
    canvas.width = width; canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(6,6,11,0.5)'; ctx.fillRect(0, 0, width, height);

    const centerY = height / 2;
    ctx.fillStyle = color;
    const step = Math.max(1, Math.floor(waveformData.length / width));

    for (let i = 0; i < width && i * step < waveformData.length; i++) {
        const val = waveformData[i * step];
        const barH = Math.abs(val) * centerY * 0.9;
        ctx.fillRect(i, centerY - barH, 1, barH * 2 || 1);
    }
}

function downloadEnhanced() {
    if (!intelState.enhancedAudioBase64) return;
    const byteString = atob(intelState.enhancedAudioBase64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const blob = new Blob([ab], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'enhanced_audio.wav'; a.click();
    URL.revokeObjectURL(url);
    showToast('Enhanced audio downloaded!', 'success');
}

// ═══ TOAST NOTIFICATIONS ═══
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ═══ MAKE FUNCTIONS GLOBAL ═══
window.deleteSample = deleteSample;
window.activateModel = activateModel;
