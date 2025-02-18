// script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM-Elemente (alle) ---
    const fileUpload = document.getElementById('file-upload');
    const recordAudioBtn = document.getElementById('record-audio');
    const recordVideoBtn = document.getElementById('record-video');
    const capturePhotoBtn = document.getElementById('capture-photo');
    const editorSection = document.getElementById('editor-section');
    const audioTracksContainer = document.getElementById('audio-tracks');
    const videoTracksContainer = document.getElementById('video-tracks');
    const imageTracksContainer = document.getElementById('image-tracks');
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
    const visualsCanvas = document.getElementById('visuals-canvas');
    const visualsContext = visualsCanvas ? visualsCanvas.getContext('2d') : null;
    const volumeSlider = document.getElementById('volume');
    const panningSlider = document.getElementById('panning'); // Hinzugefügt
    const brightnessSlider = document.getElementById('brightness');
    const contrastSlider = document.getElementById('contrast');
    const saturationSlider = document.getElementById('saturation');
    const hueSlider = document.getElementById('hue');
    const transparencySlider = document.getElementById('transparency');
    const exportSection = document.getElementById('export-section');
    const exportFormatSelect = document.getElementById('export-format');
    const exportVideoButtonFormat = document.getElementById('export-video-format');
    const exportButton = document.getElementById('export-button');
    const concertPitchInput = document.getElementById('concert-pitch');
    const detectPitchBtn = document.getElementById('detect-pitch');
    const detectKeyBtn = document.getElementById('detect-key');
    const detectBpmBtn = document.getElementById('detect-bpm');
    const saveProjectBtn = document.getElementById('save-project');
    const loadProjectInput = document.getElementById('load-project');
    const shareProjectBtn = document.getElementById('share-project');
    const uploadProgress = document.getElementById('upload-progress');
    const uploadProgressSpan = uploadProgress.querySelector('span');
    const exportProgress = document.getElementById('export-progress');
    const exportProgressSpan = exportProgress.querySelector('span');
    const filterTypeSelect = document.getElementById('filter-type');
    const filterCutoffSlider = document.getElementById('filter-cutoff');
    const visualsModeSelect = document.getElementById('visuals-mode');
    //Neu: Export-Optionen
    const exportStartInput = document.getElementById('export-start');
    const exportEndInput = document.getElementById('export-end');
    const exportResolutionSelect = document.getElementById('export-resolution');
    const exportFramerateSelect = document.getElementById('export-framerate');
    const exportAudioBitrateSelect = document.getElementById('export-audio-bitrate');
    const exportMessageDiv = document.getElementById('export-message'); // Für Meldungen

    // --- Globale Variablen ---
    let mediaRecorder;
    let recordedChunks = [];
    let tracks = [];
    let currentTrackId = 0;
    let wavesurferInstances = {};
    let isPlaying = false;
    let zoomLevel = 1;
    let snapToGrid = false;
    let audioContext = new(window.AudioContext || window.webkitAudioContext)();
    let analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const audioWorker = new Worker('worker.js');

    let selectedTracks = [];
    let isDragging = false;
    let dragStartX = 0;
    let selectionDiv = document.createElement('div');
    selectionDiv.classList.add('selection-box');
    timeline.appendChild(selectionDiv);

    let copiedTrack = null; //für kopierte Spuren
    let undoStack = [];
    let redoStack = [];
    const MAX_UNDO_STATES = 50;
    let exportStartTime = 0;  // Standardwerte
    let exportEndTime = 0;

    // --- Initialisierungen ---

    // Kammerton (aus localStorage laden oder Standardwert setzen)
    let concertPitch = parseFloat(localStorage.getItem('concertPitch')) || 440;
    concertPitchInput.
