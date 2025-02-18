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
    const exportButton = document.getElementById('export-button');
    const concertPitchInput = document.getElementById('concert-pitch');
    const detectPitchBtn = document.getElementById('detect-pitch');
    const detectKeyBtn = document.getElementById('detect-key');
    const detectBpmBtn = document.getElementById('detect-bpm');
    const saveProjectBtn = document.getElementById('save-project');
    const loadProjectInput = document.getElementById('load-project');
    const uploadProgress = document.getElementById('upload-progress'); // Hinzugefügt
    const uploadProgressSpan = uploadProgress.querySelector('span'); // Hinzugefügt
    const exportProgress = document.getElementById('export-progress');
    const exportProgressSpan = exportProgress.querySelector('span');


    // --- Globale Variablen ---
    let mediaRecorder;
    let recordedChunks = [];
    let tracks = [];
    let currentTrackId = 0;
    let wavesurferInstances = {};
    let isPlaying = false;
    let zoomLevel = 1;
    let snapToGrid = false;
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();
    let analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const audioWorker = new Worker('worker.js');

    let selectedTracks = []; // Ausgewählte Spuren
    let isDragging = false;
    let dragStartX = 0;
    let selectionDiv = document.createElement('div'); // Bereichsauswahl-Div
    selectionDiv.classList.add('selection-box');
    timeline.appendChild(selectionDiv);


    // --- Initialisierungen ---

    // Kammerton (aus localStorage oder Standardwert)
    let concertPitch = parseFloat(localStorage.getItem('concertPitch')) || 440;
    concertPitchInput.value = concertPitch;


    // --- Event-Listener (Haupt-Listener) ---
    fileUpload.addEventListener('change', async (event) => {
        await handleFiles(event.target.files);
    });
    recordAudioBtn.addEventListener('click', startRecordingAudio);
    recordVideoBtn.addEventListener('click', startRecordingVideo);
    playPauseBtn.addEventListener('click', togglePlayPause);
    cutBtn.addEventListener('click', cutSelectedTracks);
    deleteBtn.addEventListener('click', deleteSelectedTracks);
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    zoomInBtn.addEventListener('click', () => { zoomLevel *= 1.2; updateZoom(); });
    zoomOutBtn.addEventListener('click', () => { zoomLevel /= 1.2; updateZoom(); });
    snapToGridCheckbox.addEventListener('change', () => { snapToGrid = snapToGridCheckbox.checked; });
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

    // --- Drag & Drop ---
    timeline.addEventListener('drop', handleDrop);
    timeline.addEventListener('dragover', handleDragOver);

    // --- Bereichsauswahl ---
    timeline.addEventListener('mousedown', handleTimelineMouseDown);
    timeline.addEventListener('mousemove', handleTimelineMouseMove);
    timeline.addEventListener('mouseup', handleTimelineMouseUp);

    // --- Tastaturkürzel ---
    document.addEventListener('keydown', handleKeyDown);


    // --- Hilfsfunktionen ---

    // Dateien einlesen
    async function handleFiles(files) {
      uploadProgress.style.display = "block"; // Fortschrittsanzeige einblenden
      uploadProgress.querySelector("progress").value = 0;
      uploadProgressSpan.textContent = "Dateien werden geladen...";

      let fileCount = files.length;
      let loadedCount = 0;

      for (const file of files) {
        try {
          if (file.type.startsWith('audio')) {
            const audioBuffer = await getAudioBufferFromFile(file);
            addMediaToTimeline(file, 'audio', audioBuffer);
          } else {
            addMediaToTimeline(file);
          }
        } catch (error) {
          console.error("Fehler beim Laden/Decodieren der Datei:", error);
          alert(`Fehler beim Laden von ${file.name}.  Bitte stelle sicher, dass es sich um eine unterstützte Mediendatei handelt.`);
        }

        loadedCount++;
        uploadProgress.querySelector("progress").value = (loadedCount / fileCount) * 100; // Fortschritt aktualisieren
      }
      uploadProgressSpan.textContent = "Dateien geladen!";
      setTimeout(() => { uploadProgress.style.display = "none"; }, 2000); // Ausblenden nach 2 Sek.
       editorSection.style.display = 'block'; // Editor-Sektion anzeigen
       exportSection.style.display = 'block'; // Export-Sektion anzeigen
    }

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
        const worker = new Worker('./audio-worker.js');

        return new Promise((resolve, reject) => {
            worker.onmessage = (e) => {
                if (e.data.error) {
                    reject(e.data.error);
                } else {
                    resolve(e.data.blob);
                }
                worker.terminate(); // Worker beenden
            };

            worker.onerror = (error) => {
                reject(error);
                worker.terminate();
            };

            worker.postMessage({ audioBuffer, type });
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
    //Debounce Funktion
      function debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    // --- Funktionen für die Aufnahme ---
     async function startRecordingAudio() {
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {sampleRate: audioContext.sampleRate}, video: false }); // Audio-Stream anfordern
        startRecording(stream, 'audio');
      } catch(err){
        alert('Bitte erlauben Sie den Zugriff auf das Mikrophon');
      }

    }
    async function startRecordingVideo() {
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ audio: {sampleRate: audioContext.sampleRate}, video: true });
        startRecording(stream, 'video');
      } catch(err){
        alert('Bitte erlauben Sie den Zugriff auf die Kamera und das Mikrophon');
      }
    }

    function startRecording(stream, type) {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            // Stoppe die aktuelle Aufnahme, bevor eine neue gestartet wird
            mediaRecorder.stop();
        }

        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
          const blob = new Blob(recordedChunks, { type: type === 'audio' ? 'audio/webm' : 'video/webm' });
           if (type === 'audio') {
                try {
                    const audioBuffer = await getAudioBufferFromFile(blob);
                    addMediaToTimeline(blob, 'audio', audioBuffer);
                }
                catch (error){
                    console.error("Fehler beim Decodieren der Aufnahme:", error);
                    alert("Fehler beim Verarbeiten der Aufnahme.");
                }

            } else {
                addMediaToTimeline(blob, type);
            }
          stream.getTracks().forEach(track => track.stop()); // Stream beenden
          editorSection.style.display = 'block'; // Editor-Sektion anzeigen
          exportSection.style.display = 'block';
        };

        mediaRecorder.start();
        // Visuelles Feedback, dass die Aufnahme läuft (optional)
    }

    // --- Funktionen für die Zeitleiste ---
      async function addMediaToTimeline(file, mediaType, audioBuffer, trackData) {
        const trackId = currentTrackId++;
        const url = URL.createObjectURL(file);
        const trackElement = document.createElement('div');
        trackElement.classList.add('track');
        trackElement.id = `track-${trackId}`;
        trackElement.dataset.trackId = trackId;
        trackElement.dataset.mediaType = mediaType || (file.type.startsWith('audio') ? 'audio' : file.type.startsWith('video') ? 'video' : 'image');
        trackElement.dataset.startTime = (trackData && trackData.startTime) || 0;
        trackElement.draggable = true;

        let duration = 0; // Standardwert

        if (mediaType === 'audio') {
            const audioElement = document.createElement('audio');
            audioElement.src = url;
            audioElement.controls = false; // Controls für die Audio-Wellenform-Ansicht entfernen
            trackElement.appendChild(audioElement);

            // Erstelle eine Wavesurfer-Instanz für diese Audiospur
            const wavesurfer = WaveSurfer.create({
                container: `#track-${trackId}`,
                waveColor: '#D9DCFF',
                progressColor: '#4353FF',
                cursorColor: '#fff',
                barWidth: 3,
                responsive: true,
                height: 50,
                normalize: true,
            });
            wavesurfer.load(url);
            wavesurferInstances[trackId] = wavesurfer;

            // Dauer der Tonspur herausfinden, sobald die Metadaten geladen sind
            if (!trackData) {
                duration = audioBuffer.duration; //audioBuffer immer mitschicken
            } else {
                duration = trackData.duration;
            }

              // Audio-Kontext für diese Spur erstellen (für Effekte)
            const trackAudioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = trackAudioContext.createMediaElementSource(audioElement); //audioElement anstatt file

            const gainNode = trackAudioContext.createGain();
            const pannerNode = trackAudioContext.createStereoPanner();
            //Hier BiquadFilterNode hinzufügen

            source.connect(gainNode);
            gainNode.connect(pannerNode);
            pannerNode.connect(trackAudioContext.destination);

            // Speichern der Audio-Kontext-Informationen im Track-Objekt
            trackElement.dataset.audioContext = trackAudioContext; // Wichtig für spätere Verwendung
            trackElement.dataset.gainNode = gainNode;         // Wichtig für spätere Verwendung
            trackElement.dataset.pannerNode = pannerNode;       // Wichtig für spätere Verwendung

            audioTracksContainer.appendChild(trackElement);

        } else if (mediaType === 'video') {
            const videoElement = document.createElement('video');
            videoElement.src = url;
            videoElement.controls = false; // Eigene Controls verwenden
            trackElement.appendChild(videoElement);
            videoTracksContainer.appendChild(trackElement);

             if (!trackData) { //Wenn keine trackDaten vorhanden sind
                duration = await new Promise((resolve) => {  //auf Metadaten warten
                    videoElement.addEventListener('loadedmetadata', () => {
                        resolve(videoElement.duration);
                    });
                });
            } else { //wenn trackDaten vorhanden
                duration = trackData.duration; //trackData verwenden
            }

        } else if (mediaType === 'image') {
            const imageElement = document.createElement('img');
            imageElement.src = url;
            trackElement.appendChild(imageElement);
            videoTracksContainer.appendChild(trackElement); // Bilder auch zu Video

            // Für Bilder eine feste Anzeigedauer festlegen (z.B. 5 Sekunden)
            duration = trackData && trackData.duration ? trackData.duration : 5;
        }

        trackElement.style.width = `${duration * 50 * zoomLevel}px`; // Breite setzen (zoomen)
        trackElement.style.left = `${(trackData && trackData.startTime || 0) * 50 * zoomLevel}px`; // und Zeit setzen
         // Werte aus trackData wiederherstellen (falls vorhanden)
        if (trackData) {
            if (trackData.volume !== undefined) {
                volumeSlider.value = trackData.volume
            }
            // Weitere Eigenschaften wiederherstellen
        }
        // Track-Objekt erstellen und hinzufügen
        const track = {
            id: trackId,
            element:
