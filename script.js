// script.js

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM-Elemente (alle) ---
    const fileUpload = document.getElementById('file-upload');
    const recordAudioBtn = document.getElementById('record-audio');
    const recordVideoBtn = document.getElementById('record-video');
    const capturePhotoBtn = document.getElementById('capture-photo'); // Neu: Foto-Button
    const editorSection = document.getElementById('editor-section');
    const audioTracksContainer = document.getElementById('audio-tracks');
    const videoTracksContainer = document.getElementById('video-tracks');
    const imageTracksContainer = document.getElementById('image-tracks'); // Neu: Container für Bildspuren
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
    const shareProjectBtn = document.getElementById('share-project'); //Hinzugefügt
    const uploadProgress = document.getElementById('upload-progress');
    const uploadProgressSpan = uploadProgress.querySelector('span');
    const exportProgress = document.getElementById('export-progress');
    const exportProgressSpan = exportProgress.querySelector('span');
    const filterTypeSelect = document.getElementById('filter-type'); //hinzugefügt
    const filterCutoffSlider = document.getElementById('filter-cutoff'); //hinzugefügt
    const visualsModeSelect = document.getElementById('visuals-mode'); //Für die Auswahl der Visualisierungsmodi


    // --- Globale Variablen ---
    let mediaRecorder;          // Für die Aufnahme (Audio/Video/Foto)
    let recordedChunks = [];   // Speichert die aufgenommenen Daten (Audio/Video)
    let tracks = [];            // Array, das alle Spuren (Audio, Video, Bild) enthält
    let currentTrackId = 0;     // Eindeutige ID für jede neue Spur
    let wavesurferInstances = {}; // Speichert Wavesurfer.js-Instanzen (für Audio-Wellenformen)
    let isPlaying = false;      // Gibt an, ob die Wiedergabe aktiv ist
    let zoomLevel = 1;          // Zoom-Faktor der Zeitleiste (1 = Standard)
    let snapToGrid = false;     // Gibt an, ob Einrasten am Raster aktiviert ist (Standard: aus)
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();  // *Ein* zentraler AudioContext
    let analyser = audioContext.createAnalyser(); // Für Frequenzanalyse (Kammerton, Visuals, etc.)
    analyser.fftSize = 2048; // Standardwert, kann angepasst werden (Potenz von 2!)
    const bufferLength = analyser.frequencyBinCount;  // Hälfte von fftSize
    const dataArray = new Uint8Array(bufferLength); // Byte-Array für die Frequenzdaten

    let selectedTracks = [];    // Array der aktuell ausgewählten Spur-IDs
    let isDragging = false;     // Gibt an, ob gerade eine Bereichsauswahl (mit der Maus) stattfindet
    let dragStartX = 0;         // X-Koordinate des Mauszeigers beim Start des Ziehens
    let selectionDiv = document.createElement('div'); // Bereichsauswahl-Div (wird nur *einmal* erstellt)
    selectionDiv.classList.add('selection-box');
    timeline.appendChild(selectionDiv); // Zum Timeline-Container hinzufügen

    let copiedTrack = null;     // Speichert den Inhalt des zuletzt kopierten Tracks (für "Einfügen")
    let undoStack = [];         // Array für den Undo-Verlauf (Speichert Projektzustände)
    let redoStack = [];         // Array für den Redo-Verlauf
    const MAX_UNDO_STATES = 50;  // Maximale Anzahl an Undo/Redo-Schritten (kann angepasst werden)

    // --- Web Worker Setup ---
    const audioWorker = new Worker('worker.js');



    // --- Initialisierungen ---

    // Kammerton (aus localStorage laden oder Standardwert setzen)
    let concertPitch = parseFloat(localStorage.getItem('concertPitch')) || 440;
    concertPitchInput.value = concertPitch;

     // Editor-Sektion anzeigen, Upload-Sektion ausblenden (für den direkten Start im Editor)
     editorSection.style.display = 'block';
     //uploadSection.style.display = 'none'; // Wird beim Laden wieder eingeblendet, falls nötig



    // --- Event-Listener (Haupt-Listener) ---

    // Datei-Upload (mehrere Dateien)
    fileUpload.addEventListener('change', async (event) => {
        await handleFiles(event.target.files);
    });

    // Audio aufnehmen
    recordAudioBtn.addEventListener('click', startRecordingAudio);
    async function startRecordingAudio() {
        try {
            // Zugriff auf Audio-Eingabegerät anfordern (mit Samplerate des *zentralen* AudioContext)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: audioContext.sampleRate }, video: false });
            startRecording(stream, 'audio');
        } catch (err) {
            // Fehlerbehandlung: Benutzer informieren!
            alert('Fehler beim Zugriff auf das Mikrofon: ' + err.message + "\nBitte erlaube den Zugriff und versuche es erneut.");
            console.error(err); // Detaillierte Fehlermeldung in der Konsole
        }
    }

    // Video aufnehmen
    recordVideoBtn.addEventListener('click', startRecordingVideo);
    async function startRecordingVideo() {
        try {
            // Zugriff auf Video- *und* Audio-Eingabegerät anfordern (Audio ist für Synchronisation wichtig!)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: audioContext.sampleRate }, video: true });
            startRecording(stream, 'video');
        } catch (err) {
            // Fehlerbehandlung: Benutzer informieren!
            alert('Fehler beim Zugriff auf Kamera/Mikrofon: ' + err.message + "\nBitte erlaube den Zugriff und versuche es erneut.");
            console.error(err);
        }
    }

    // Foto aufnehmen
    capturePhotoBtn.addEventListener('click', capturePhoto);
    async function capturePhoto() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true }); // Zugriff auf die Webcam
            const videoElement = document.createElement('video'); // Erstelle ein <video>-Element
            videoElement.srcObject = stream;
            await videoElement.play(); // WICHTIG: Warten, bis das Video abgespielt wird!

            const canvas = document.createElement('canvas'); // Erstelle ein <canvas>-Element
            canvas.width = videoElement.videoWidth; // Breite = Video-Breite
            canvas.height = videoElement.videoHeight; // Höhe = Video-Höhe
            const context = canvas.getContext('2d');  // 2D-Kontext für das Zeichnen

            // Zeichne den aktuellen Frame des Videos auf das Canvas
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Bilddaten aus dem Canvas als Blob extrahieren (JPEG-Format, Qualität 0.9)
            canvas.toBlob((blob) => {
                addMediaToTimeline(blob, 'image'); // Füge das Bild als Spur hinzu

                 // Aufräumen: Stream stoppen und Video-Element entfernen
                stream.getTracks().forEach(track => track.stop());
                videoElement.remove();
            }, 'image/jpeg', 0.9);


        } catch (err) {
            alert('Fehler beim Zugriff auf die Kamera: ' + err.message);
            console.error(err);
        }
    }


    // --- Haupt-Aufnahmefunktion (Audio/Video) ---
    function startRecording(stream, type) {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop(); // Stoppe die aktuelle Aufnahme, falls vorhanden
        }

        mediaRecorder = new MediaRecorder(stream); // Neuen MediaRecorder erstellen
        recordedChunks = []; // Array für die aufgenommenen Daten leeren

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data); // Daten hinzufügen
            }
        };

        mediaRecorder.onstop = async () => {
            const blob = new Blob(recordedChunks, { type: type === 'audio' ? 'audio/webm' : 'video/webm' }); // Blob erstellen

            let audioBuffer;
            if (type === 'audio') {
                try {
                    audioBuffer = await getAudioBufferFromFile(blob); // AudioBuffer decodieren (nur für Audio)
                    addMediaToTimeline(blob, 'audio', audioBuffer); // Neue Audiospur hinzufügen
                } catch (error) {
                    console.error("Fehler beim Decodieren der Aufnahme:", error);
                    alert("Fehler beim Verarbeiten der Aufnahme.");
                    return; // Stoppe die Ausführung bei einem Fehler
                }
            } else {
                addMediaToTimeline(blob, type); // Neue Video- oder Bildspur hinzufügen
            }

            // Stream *sofort* stoppen, nachdem der Blob erstellt wurde
            stream.getTracks().forEach(track => track.stop());
            editorSection.style.display = 'block'; // Editor-Sektion anzeigen (falls nicht schon sichtbar)
            exportSection.style.display = 'block';
        };

          mediaRecorder.onerror = (error) => { // Fehlerbehandlung Hinzufügen
            console.error("Fehler bei der Aufnahme:", error);
             alert(`Fehler bei der Aufnahme (${type}): ${error.message}`);

            // Stream stoppen, um Ressourcen freizugeben
              stream.getTracks().forEach((track) => track.stop());
           };

        mediaRecorder.start(); // Aufnahme starten
        // Optional: Visuelles Feedback, dass die Aufnahme läuft (z.B. Button-Text ändern)
    }

    // --- Hinzufügen von Medien zur Zeitleiste ---
    async function addMediaToTimeline(file, mediaType, audioBuffer, trackData) {
        const track = createTrack(file, mediaType, audioBuffer, trackData);  // Erstellt das *Track-Objekt*
        tracks.push(track); // Füge den Track zum globalen Track-Array hinzu
        const trackElement = track.element; // Greife auf das DOM-Element zu

        // Event-Listener für die Spur (Auswahl, etc.)
        trackElement.addEventListener('click', (event) => {
            selectTrack(track.id, event);
        });

        // Füge das Element *zuerst* zum DOM hinzu (wichtig für Wavesurfer.js!)
        if (mediaType === 'audio') {
            audioTracksContainer.appendChild(trackElement);
        } else if (mediaType === 'video') {
            videoTracksContainer.appendChild(trackElement);
        } else if (mediaType === 'image') {
            videoTracksContainer.appendChild(trackElement); // Bilder zur Videospur (für jetzt)
        }

        // *Nachdem* das Element im DOM ist, können wir die Wavesurfer-Instanz erstellen (für Audio)
        if (mediaType === 'audio') {
            const wavesurfer = WaveSurfer.create({
                container: `#track-${track.id}`, // Verwende die *ID des Containers*
                waveColor: '#D9DCFF',
                progressColor: '#4353FF',
                cursorColor: '#fff',
                barWidth: 3,
                responsive: true,
                height: 50,
                normalize: true,
            });
            wavesurfer.load(track.src); // URL des Blobs laden
            wavesurferInstances[track.id] = wavesurfer; // Wavesurfer-Instanz speichern
        }

          // Metadaten laden (Dauer) *asynchron*, falls keine Trackdaten vorhanden
        if (!trackData) {
            if (mediaType === "audio" || mediaType === "video") {
                track.mediaElement.addEventListener('loadedmetadata', () => {
                    track.duration = track.mediaElement.duration; // Dauer auslesen
                    updateTrackDisplay(track); // Zeitleiste aktualisieren
                });

            } else if (mediaType === 'image') {
                track.duration = 5; // Standarddauer für Bilder (5 Sekunden)
                updateTrackDisplay(track); // Zeitleiste aktualisieren
            }
        } else {
            // Werte aus trackData wiederherstellen (falls vorhanden)
            track.startTime = trackData.startTime;
            track.duration = trackData.duration;
            //Effekte wiederherstellen
            if (trackData.effectValues) {
                track.effectValues = trackData.effectValues;
                if(trackData.effectValues.volume !== undefined){
                  track.gainNode.gain.value = trackData.effectValues.volume;
                }
                  // Wiederherstellen von Filter, falls vorhanden
                  if(trackData.effectValues.filterType !== undefined && track.filterNode){
                    track.filterNode.type = trackData.effectValues.filterType;
                    filterTypeSelect.value = trackData.effectValues.filterType; // Wert im Auswahlfeld aktualisieren
                  }
                  if(trackData.effectValues.filterCutoff !== undefined && track.filterNode){
                    track.filterNode.frequency.value = trackData.effectValues.filterCutoff;
                    filterCutoffSlider.value = trackData.effectValues.filterCutoff; // Wert im Schieberegler aktualisieren
                  }
            }

            updateTrackDisplay(track); // Visuelle Darstellung *sofort* aktualisieren
        }

         updateTrackDisplay(track); // *Immer* aufrufen, um die Spur korrekt zu positionieren
    }


    // --- Hilfsfunktion zum Erstellen eines neuen Track-Objekts ---

    function createTrack(file, type, audioBuffer, trackData) {
        const trackId = currentTrackId++;
        const url = URL.createObjectURL(file); // URL für den Blob erstellen
        const trackElement = document.createElement('div'); // Container für die Spur erstellen
        trackElement.classList.add('track');
        trackElement.id = `track-${trackId}`;
        trackElement.dataset.trackId = trackId; // ID für spätere Referenz speichern
        trackElement.draggable = true; // Drag & Drop aktivieren

        let mediaElement = null;
        let sourceNode = null;

        if (type === 'audio' || type === 'video') {
            mediaElement = document.createElement(type); // <audio> oder <video>
