// script.js

document.addEventListener('DOMContentLoaded', () => {
  // DOM-Elemente
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
  const deleteBtn = document.getElementById('delete');
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const snapToGridCheckbox = document.getElementById('snap-to-grid');
  const timeline = document.querySelector('.timeline');
  const cursor = document.getElementById('cursor'); // Abspielcursor
  const visualsCanvas = document.getElementById('visuals-canvas');
  const visualsContext = visualsCanvas.getContext('2d');
  const volumeSlider = document.getElementById('volume');
  const brightnessSlider = document.getElementById('brightness');
  const contrastSlider = document.getElementById('contrast');
  const saturationSlider = document.getElementById('saturation');
  const hueSlider = document.getElementById('hue');
  const transparencySlider = document.getElementById('transparency');
  const exportSection = document.getElementById('export-section');
  const exportFormatSelect = document.getElementById('export-format');
  const exportButton = document.getElementById('export-button');
  const concertPitchInput = document.getElementById('concert-pitch');
  const detectPitchBtn = document.getElementById('detect-pitch');
  const detectKeyBtn = document.getElementById('detect-key');
  const detectBpmBtn = document.getElementById('detect-bpm');
  const saveProjectBtn = document.getElementById('save-project'); // Hinzufügen
  const loadProjectInput = document.getElementById('load-project'); // Hinzufügen


  // Globale Variablen
  let mediaRecorder;
  let recordedChunks = [];
  let tracks = []; // Array zur Speicherung der Spuren (Audio/Video)
  let currentTrackId = 0;
  let wavesurferInstances = {}; // Speichert Wavesurfer-Instanzen für jede Audiospur
  let isPlaying = false;
  let zoomLevel = 1; // 1 = Standardzoom
  let snapToGrid = false;
  let audioContext = new(window.AudioContext || window.webkitAudioContext)();
  let analyser = audioContext.createAnalyser(); // Für Frequenzanalyse (Kammerton-Erkennung)
  analyser.fftSize = 2048; // Standardwert, kann angepasst werden
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  const audioWorker = new Worker('worker.js'); // Web Worker instanziieren

  // Kammerton aus localStorage laden (falls vorhanden)
  let concertPitch = localStorage.getItem('concertPitch') || 440;
  concertPitchInput.value = concertPitch;

  // --- Event-Listener ---

  //Datei Upload
  fileUpload.addEventListener('change', async (event) => {
    handleFiles(event.target.files);
  });

  //Audioaufnahme
  recordAudioBtn.addEventListener('click', startRecordingAudio);
  async function startRecordingAudio
