// script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM-Elemente (alle) ---
    // Ruft alle wichtigen HTML-Elemente ab, damit wir mit ihnen interagieren können.
    const fileUpload = document.getElementById('file-upload');
    const recordAudioBtn = document.getElementById('record-audio');
    const recordVideoBtn = document.getElementById('record-video');
    const editorSection = document.getElementById('editor-section');
    const audioTracksContainer = document.getElementById('audio-tracks');
    const videoTracksContainer = document.getElementById('video-tracks');
    const videoPreview = document.getElementById('video-preview');
    const audioPreview = document.getElementById('audio-preview');
    const playPauseBtn = document.getElementById('play-pause');
    const cutBtn = document.getElementById('cut');
    const copyBtn = document.getElementById('copy');
    const pasteBtn = document.getElementById('paste');
    const deleteBtn = document.getElementById('delete');
    const undoBtn = document.getElementById('undo');
    const redoBtn = document.getElementById('redo');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const snapToGridCheckbox = document.getElementById('snap-to-grid');
    const timeline = document.querySelector('.timeline');
    const cursor = document.getElementById('cursor');
    const visualsCanvas = document.getElementById('visuals-canvas'); // Optional
    const visualsContext = visualsCanvas ? visualsCanvas.getContext('2d') : null; // Optional
    const volumeSlider = document.getElementById('volume');
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const hueSlider = document.getElementById('hue');
    const transparencySlider = document.getElementById('transparency');
    const exportSection = document.getElementById('export-section');
    const exportFormatSelect = document.getElementById('export-format');
    const exportVideoButtonFormat = document.getElementById('export-video-format'); //Neu
    const exportButton = document.getElementById('export-button');
    const concertPitchInput = document.getElementById('concert-pitch');
    const detectPitchBtn = document.getElementById('detect-pitch');
    const detectKeyBtn = document.getElementById('detect-key');
    const detectBpmBtn = document.getElementById('detect-bpm');
    const saveProjectBtn = document.getElementById('save-project');
    const loadProjectInput = document.getElementById('load-project');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadProgressSpan = uploadProgress.querySelector('span');
    const exportProgress = document.getElementById('export-progress');
    const exportProgressSpan = exportProgress.querySelector('span');
    const filterTypeSelect = document.getElementById('filter-type'); //hinzugefügt
    const filterCutoffSlider = document.getElementById('filter-cutoff'); //hinzugefügt



    // --- Globale Variablen ---

    let mediaRecorder;          // Für die Aufnahme (Audio/Video)
    let recordedChunks = [];   // Speichert die aufgenommenen Daten
    let tracks = [];            // Array, das alle Spuren (Audio, Video, Bild) enthält
    let currentTrackId = 0;     // Eindeutige ID für jede neue Spur
    let wavesurferInstances = {}; // Speichert Wavesurfer-Instanzen für Audio-Wellenformen
    let isPlaying = false;      // Gibt an, ob die Wiedergabe aktiv ist
    let zoomLevel = 1;          // Zoom-Faktor der Zeitleiste (1 = Standard)
    let snapToGrid = false;     // Gibt an, ob Einrasten am Raster aktiviert ist
    // *Ein* zentraler AudioContext für die gesamte Anwendung!
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let analyser = audioContext.createAnalyser();  // Für Frequenzanalyse (Kammerton, Visuals)
    analyser.fftSize = 2048; // Standardwert, kann angepasst werden
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    let selectedTracks = [];    // Array der aktuell ausgewählten Spur-IDs
    let isDragging = false;     // Gibt an, ob gerade eine Bereichsauswahl stattfindet
    let dragStartX = 0;         // X-Koordinate des Mauszeigers beim Start des Ziehens
    // Bereichsauswahl-Div (wird nur einmal erstellt und dann wiederverwendet)
    let selectionDiv = document.createElement('div');
    selectionDiv.classList.add('selection-box');
    timeline.appendChild(selectionDiv);

    let copiedTrack = null;     // Speichert den kopierten Track (Inhalt)
    let undoStack = [];         // Array für den Undo-Verlauf
    let redoStack = [];         // Array für den Redo-Verlauf
    const MAX_UNDO_STATES = 50;  // Maximale Anzahl an Undo/Redo-Schritten

    // --- Initialisierungen ---

    // Kammerton (aus localStorage laden oder Standardwert setzen)
    let concertPitch = parseFloat(localStorage.getItem('concertPitch')) || 440;
    concertPitchInput.value = concertPitch;


    // --- Web Worker Setup ---
    const audioWorker = new Worker('worker.js'); // Instanziiert den Web Worker

    // --- Event-Listener (Haupt-Listener) ---

    // Datei-Upload (mehrere Dateien)
    fileUpload.addEventListener('change', async (event) => {
        await handleFiles(event.target.files);
    });

    // Audio aufnehmen
    recordAudioBtn.addEventListener('click', startRecordingAudio);
    async function startRecordingAudio() {
        try {
            // Zugriff auf Audio-Eingabegerät anfordern (mit Samplerate des AudioContext)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: audioContext.sampleRate }, video: false });
            startRecording(stream, 'audio');
        } catch (err) {
            // Fehlerbehandlung: Benutzer informieren!
            alert('Fehler beim Zugriff auf das Mikrofon: ' + err.message + "\nBitte erlaube den Zugriff und versuche es erneut.");
            console.error
