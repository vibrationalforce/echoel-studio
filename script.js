// script.js

document.addEventListener('DOMContentLoaded', () => {

  // --- DOM-Elemente (alle) ---
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
  const exportVideoButtonFormat = document.getElementById('export-video-format'); // Hinzugefügt
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
  let mediaRecorder;
  let recordedChunks = [];
  let tracks = [];
  let currentTrackId = 0;
  let wavesurferInstances = {};
  let isPlaying = false;
  let zoomLevel = 1;
  let snapToGrid = false; // Standardmäßig aus
  // *Ein* zentraler AudioContext für die gesamte Anwendung!
  let audioContext = new(window.AudioContext || window.webkitAudioContext)();
  let analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  // Web Worker Instanz
  const audioWorker = new Worker('worker.js');

  let selectedTracks = []; // Ausgewählte Spuren
  let isDragging = false;
  let dragStartX = 0;
  // Bereichsauswahl-Div (wird nur einmal erstellt und dann wiederverwendet)
  let selectionDiv = document.createElement('div');
  selectionDiv.classList.add('selection-box');
  timeline.appendChild(selectionDiv);

  let copiedTrack = null; // Hinzugefügt: Speichert den kopierten Track
  let undoStack = []; // Hinzugefügt: Undo-Verlauf
  let redoStack = []; // Hinzugefügt: Redo-Verlauf
  const MAX_UNDO_STATES = 50; // Konstante für maximale Undo-Schritte

  // --- Initialisierungen ---

  // Kammerton (aus localStorage laden oder Standardwert setzen)
  let concertPitch = parseFloat(localStorage.getItem('concertPitch')) || 440;
  concertPitchInput.value = concertPitch;

  // --- Event-Listener (Haupt-Listener, *nicht* in addMediaToTimeline) ---

  //Datei Upload
  fileUpload.addEventListener('change', async (event) => {
    await handleFiles(event.target.files);
  });

  //Audioaufnahme
  recordAudioBtn.addEventListener('click', startRecordingAudio);
  async function startRecordingAudio() {
    try {
      // Zugriff auf Audio-Eingabegerät anfordern (mit Samplerate des AudioContext)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: audioContext.sampleRate
        },
        video: false
      }); // Audio-Stream anfordern
      startRecording(stream, 'audio');
    } catch (err) {
      // Fehlerbehandlung: Benutzer informieren!
      alert('Fehler beim Zugriff auf das Mikrofon: ' + err.message + "\nBitte erlaube den Zugriff und versuche es erneut.");
      console.error(err); // Detaillierte Fehlermeldung in der Konsole
    }
  }

  //Videoaufnahme
  recordVideoBtn.addEventListener('click', startRecordingVideo);
  async function startRecordingVideo() {
    try {
      // Zugriff auf Video- und Audio-Eingabegerät anfordern
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: audioContext.sampleRate
        },
        video: true
      });
      startRecording(stream, 'video');
    } catch (err) {
      // Fehlerbehandlung: Benutzer informieren!
      alert('Fehler beim Zugriff auf Kamera/Mikrofon: ' + err.message + "\nBitte erlaube den Zugriff und versuche es erneut.");
      console.error(err);
    }
  }

  playPauseBtn.addEventListener('click', togglePlayPause);
  cutBtn.addEventListener('click', cutSelectedTracks);
  copyBtn.addEventListener('click', copySelectedTrack); // Hinzugefügt
  pasteBtn.addEventListener('click', pasteCopiedTrack); // Hinzugefügt
  deleteBtn.addEventListener('click', deleteSelectedTracks);
  undoBtn.addEventListener('click', undo);
  redoBtn.addEventListener('click', redo);
  zoomInBtn.addEventListener('click', () => {
    zoomLevel *= 1.2;
    updateZoom();
  });
  zoomOutBtn.addEventListener('click', () => {
    zoomLevel /= 1.2;
    updateZoom();
  });
  snapToGridCheckbox.addEventListener('change', () => {
    snapToGrid = snapToGridCheckbox.checked;
  });
  concertPitchInput.addEventListener('change', updateConcertPitch);
  detectPitchBtn.addEventListener('click', detectConcertPitch);
  detectKeyBtn.addEventListener('click', () => {
     if (selectedTracks.length > 0) {
          const trackId = selectedTracks[0];
          const track = tracks.find((t) => t.id === trackId);
          if(track && track.type == 'audio'){
            detectKey(track.audioBuffer); //Aufruf über Worker
          } else {
            alert('Bitte wählen Sie eine Audiospur aus.')
          }
        } else {
            alert("Bitte zuerst eine Spur auswählen.");
        }
  });
  detectBpmBtn.addEventListener('click', () => {
     if (selectedTracks.length > 0) {
          const trackId = selectedTracks[0];
           const track = tracks.find((t) => t.id === trackId);
          if(track && track.type == 'audio'){
            detectBPM(track.audioBuffer); //Aufruf über Worker
          } else {
            alert('Bitte wählen Sie eine Audiospur aus.')
          }
        } else {
            alert("Bitte zuerst eine Spur auswählen.");
        }
  });
  saveProjectBtn.addEventListener('click', saveProject);
  loadProjectInput.addEventListener('change', loadProject);
  exportButton.addEventListener('click', exportProject);

  // --- Drag & Drop ---
  timeline.addEventListener('drop', handleDrop);
  timeline.addEventListener('dragover', handleDragOver);

  // --- Bereichsauswahl ---
  timeline.addEventListener('mousedown', handleTimelineMouseDown);
  timeline.addEventListener('mousemove', handleTimelineMouseMove);
  timeline.addEventListener('mouseup', handleTimelineMouseUp);

  // --- Tastaturkürzel ---
  document.addEventListener('keydown', handleKeyDown);

  // --- Web Worker Nachrichten-Handling ---
  audioWorker.onmessage = (event) => {
    if (event.data.type === 'keyResult') {
      console.log('Erkannte Tonart (vom Worker):', event.data.key);
      alert(`Erkannte Tonart: ${event.data.key.tonic} ${event.data.key.type}`); // Direkte Anzeige

    } else if (event.data.type === 'bpmResult') {
      console.log('Erkanntes BPM (vom Worker):', event.data.bpm);
      alert(`Erkanntes Tempo: ${event.data.bpm.toFixed(2)} BPM`); // Auf 2 Dezimalstellen runden

    } else if (event.data.type === 'audioBuffer') { //neu Hinzugefügt
      // Konvertiere die empfangenen Daten zurück in einen AudioBuffer
      const audioBuffer = audioContext.createBuffer(
        event.data.numberOfChannels,
        event.data.length,
        event.data.sampleRate
      );
      for (let i = 0; i < event.data.numberOfChannels; i++) {
        audioBuffer.getChannelData(i).set(event.data.channelData[i]);
      }

      // Erstelle einen Blob aus dem AudioBuffer
      audioBufferToBlob(audioBuffer)
        .then(blob => {
          //Verwendung des Blobs
        })
        .catch(error => {
          console.error("Fehler beim Erstellen des Blobs aus dem AudioBuffer:", error);
        });
    }
  };


  // --- Hilfsfunktionen ---

  //Debounce Funktion
  function debounce(func, wait) {
    let timeout;
    return function(...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

  // Dateien einlesen (behandelt jetzt den Fortschritt)
  async function handleFiles(files) {
    uploadProgress.style.display = "block";
    uploadProgress.querySelector("progress").value = 0;
    uploadProgressSpan.textContent = "Dateien werden geladen...";

    let fileCount = files.length;
    let loadedCount = 0;

    for (const file of files) {
      try {
        //Unterscheidung zwischen Audio, Video und Bild
        if (file.type.startsWith('audio')) {
          const audioBuffer = await getAudioBufferFromFile(file);
          addMediaToTimeline(file, 'audio', audioBuffer);
        } else if (file.type.startsWith('video')) {
          addMediaToTimeline(file, 'video');
        } else if (file.type.startsWith('image')) {
          addMediaToTimeline(file, 'image');
        } else {
          console.warn("Unbekannter Dateityp:", file.type);
          alert(`Datei "${file.name}" hat einen unbekannten Typ und wird ignoriert.`);
        }
      } catch (error) {
        console.error("Fehler beim Laden/Decodieren der Datei:", error);
        alert(`Fehler beim Laden von ${file.name}.  Bitte stelle sicher, dass es sich um eine unterstützte Mediendatei handelt.`);
      }

      loadedCount++;
      uploadProgress.querySelector("progress").value = (loadedCount / fileCount) * 100;
    }
    uploadProgressSpan.textContent = "Dateien geladen!";
    setTimeout(() => {
      uploadProgress.style.display = "none";
    }, 2000);
    editorSection.style.display = 'block';
    exportSection.style.display = 'block';
  }

  //Audiobuffer erstellen
  function getAudioBufferFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        audioContext.decodeAudioData(event.target.result, resolve, reject);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  //Blob zu data URL
  async function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  //Audiobuffer zu Blob
  async function audioBufferToBlob(audioBuffer, type = 'audio/wav') {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./audio-worker.js'); // Pfad anpassen
      worker.onmessage = (e) => {
        if (e.data.error) {
          reject(e.data.error);
        } else {
          resolve(e.data.blob);
        }
        worker.terminate();
      };
      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };
      worker.postMessage({
        audioBuffer,
        type
      });
    });
  }

  //Blob von URL
  async function getBlobFromUrl(url) {
    try {
      const response = await fetch(url); //, { mode: "no-cors" }); // no-cors entfernt, da cors jetzt kein Problem mehr darstellt
      if (response.ok) {
        return await response.blob();
      } else {
        console.error("Fehler beim Abrufen des Blobs (Status):", response.status);
        return null;
      }
    } catch (error) {
      console.error("Fehler beim Abrufen des Blobs (URL/Netzwerk):", error);
      return null;
    }
  }

  // --- Funktionen für die Aufnahme ---
  function startRecording(stream, type) {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop(); // Stoppe die aktuelle Aufnahme
    }

    mediaRecorder = new MediaRecorder(stream);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, {
        type: type === 'audio' ? 'audio/webm' : 'video/webm'
      });
      let audioBuffer; // Variable außerhalb des try-Blocks deklarieren
      if (type === 'audio') {
        try {
          audioBuffer = await getAudioBufferFromFile(blob); // Muss jetzt nicht mehr in einen try-Block
          addMediaToTimeline(blob, 'audio', audioBuffer);
        } catch (error) {
          console.error("Fehler beim Decodieren der Aufnahme:", error);
          alert("Fe
