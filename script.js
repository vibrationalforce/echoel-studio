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
    concertPitchInput.value = concertPitch;

    // Editor-Sektion anzeigen, Upload-Sektion ausblenden (für den direkten Start im Editor)
    editorSection.style.display = 'block';
    //uploadSection.style.display = 'none'; // Wird beim Laden wieder eingeblendet, falls nötig

    // Laden der Parameter, falls mit URL geteilt
    loadProjectFromUrl();
    // Initialisiere die Export-Optionen (Dropdown-Menüs)
    initializeExportOptions();


    // --- Event-Listener (Haupt-Listener) ---

    fileUpload.addEventListener('change', async (event) => {
        await handleFiles(event.target.files);
    });
    recordAudioBtn.addEventListener('click', startRecordingAudio);
    recordVideoBtn.addEventListener('click', startRecordingVideo);
    capturePhotoBtn.addEventListener('click', capturePhoto);
    playPauseBtn.addEventListener('click', togglePlayPause);
    cutBtn.addEventListener('click', cutSelectedTracks);
    copyBtn.addEventListener('click', copySelectedTrack);
    pasteBtn.addEventListener('click', pasteCopiedTrack);
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
            if (track && track.type == 'audio') {
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
            if (track && track.type == 'audio') {
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
    shareProjectBtn.addEventListener('click', shareProject);
    exportButton.addEventListener('click', exportProject);
    //Event Listener für Input-Felder
    exportStartInput.addEventListener('change', updateExportTimeRange);
    exportEndInput.addEventListener('change', updateExportTimeRange);


    // --- Drag & Drop (Timeline) ---
    timeline.addEventListener('drop', handleDrop);
    timeline.addEventListener('dragover', handleDragOver);

    // --- Bereichsauswahl ---
    timeline.addEventListener('mousedown', handleTimelineMouseDown);
    timeline.addEventListener('mousemove', handleTimelineMouseMove);
    timeline.addEventListener('mouseup', handleTimelineMouseUp);

    // --- Tastaturkürzel ---
    document.addEventListener('keydown', handleKeyDown);

    // --- Mausrad (Zoom) ---
    timeline.addEventListener('wheel', handleTimelineWheel, { passive: false });

    // --- Touch-Events (Mobile) ---
    timeline.addEventListener('touchstart', handleTouchStart, { passive: false });
    timeline.addEventListener('touchmove', handleTouchMove, { passive: false });
    timeline.addEventListener('touchend', handleTouchEnd, { passive: false });

    // --- Web Worker Nachrichten-Handling ---
    audioWorker.onmessage = (event) => {
        if (event.data.type === 'keyResult') {
            console.log('Erkannte Tonart (vom Worker):', event.data.key);
            alert(`Erkannte Tonart: ${event.data.key.tonic} ${event.data.key.type}`); // Direkte Anzeige

        } else if (event.data.type === 'bpmResult') {
            console.log('Erkanntes BPM (vom Worker):', event.data.bpm);
            alert(`Erkanntes Tempo: ${event.data.bpm.toFixed(2)} BPM`); // Auf 2 Dezimalstellen runden

        } else if (event.data.type === 'audioBuffer') {
            // Konvertiere empfangene Daten in AudioBuffer
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
        } else if (event.data.type === 'mp3Blob') {
            //Verarbeite den fertigen mp3 Blob
            const blob = event.data.mp3Blob;
            // URL für den Blob erstellen, um ihn herunterladen zu können.
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); //Link erstellen
            a.href = url;
            a.download = 'exported_audio.mp3'; // Dateiname für den Download
            document.body.appendChild(a); // Link zum Dokument hinzufügen
            a.click(); //Simuliere Klick
            document.body.removeChild(a); // Link entfernen
            URL.revokeObjectURL(url); // URL freigeben, um Speicher freizugeben
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
        uploadProgress.querySelector("progress").value = 0; //Rücksetzen
        uploadProgressSpan.textContent = "Dateien werden geladen...";

        let fileCount = files.length; //Gesamtanzahl
        let loadedCount = 0; //Anzahl der geladenen Dateien

        for (const file of files) {
            try {
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
            uploadProgress.querySelector("progress").value = (loadedCount / fileCount) * 100; //Fortschritt
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
    async function audioBufferToBlob(audioBuffer, audioType) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./audio-worker.js'); // Pfad anpassen!
            worker.onmessage = (e) => {
                if (e.data.error) {
                    reject(e.data.error);
                } else {
                    resolve(e.data.blob);
                }
                worker.terminate(); // Wichtig: Worker beenden!
            };
            worker.onerror = (err) => {
                reject(err);
                worker.terminate();
            };
            worker.postMessage({ audioBuffer, type: 'audioBufferToBlob', audioType }); // Korrekter Type
        });
    }

    //Blob von URL
    async function getBlobFromUrl(url) {
        try {
            const response = await fetch(url); //, { mode: "no-cors" }); // no-cors entfernen, da cors jetzt kein Problem mehr darstellt
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
            const blob = new Blob(recordedChunks, {
                type: type === 'audio' ? 'audio/webm' : 'video/webm'
            }); // Blob erstellen

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

            // Stream *sofort* stoppen, nachdem der Blob erstellt wurde:
            stream.getTracks().forEach(track => track.stop());
            editorSection.style.display = 'block'; // Editor-Sektion anzeigen (falls nicht schon sichtbar)
            exportSection.style.display = 'block';
        };

        mediaRecorder.onerror = (error) => { // Fehlerbehandlung hinzufügen
            console.error("Fehler bei der Aufnahme:", error);
            alert(`Fehler bei der Aufnahme (${type}): ${error.message}`);

            // Stream stoppen (um Ressourcen freizugeben)
            stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start(); // Aufnahme starten
        // Optional: Visuelles Feedback, dass die Aufnahme läuft (z.B. Button-Text ändern)
    }

    // --- Funktion zum Aufnehmen von Fotos ---
    async function capturePhoto() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true }); // Zugriff nur auf Video
            const videoElement = document.createElement('video');
            videoElement.srcObject = stream;
            await videoElement.play(); // Warten, bis das Video abgespielt wird

            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth; // Breite = Video-Breite
            canvas.height = videoElement.videoHeight; // Höhe = Video-Höhe
            const context = canvas.getContext('2d');

            // Aktuellen Frame des Videos auf das Canvas zeichnen
            context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

            // Bilddaten aus dem Canvas als Blob extrahieren (JPEG-Format, Qualität 0.9)
            canvas.toBlob((blob) => {
                addMediaToTimeline(blob, 'image');
                stream.getTracks().forEach(track => track.stop());// Stream stoppen
                videoElement.remove();// Aufräumen: Video-Element entfernen

            }, 'image/jpeg', 0.9);


        } catch (err) {
            alert('Fehler beim Zugriff auf die Kamera: ' + err.message);
            console.error(err);
        }
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

            // Effekt-Werte wiederherstellen (falls vorhanden)
            if (trackData.effectValues) {
                track.effectValues = { ...trackData.effectValues }; // Tiefe Kopie!

                // Aktualisiere die Regler *und* die AudioNodes/CSS-Filter
                if (track.type === 'audio') {
                    // Stelle sicher, dass gainNode, pannerNode, etc. initialisiert sind!
                    if (!track.gainNode) {
                        track.gainNode = audioContext.createGain();
                    }
                    if (!track.pannerNode) {
                        track.pannerNode = audioContext.createStereoPanner();
                    }
                    // ... (andere Nodes) ...
                    track.gainNode.gain
                    track.gainNode.gain.value = trackData.effectValues.volume;
                     // Wiederherstellen von Filter, falls vorhanden
                    if(trackData.effectValues.filterType !== undefined && track.filterNode){
                      track.filterNode.type = trackData.effectValues.filterType;
                      filterTypeSelect.value = trackData.effectValues.filterType; // Wert im Auswahlfeld aktualisieren
                    }
                    if(trackData.effectValues.filterCutoff !== undefined && track.filterNode){
                      track.filterNode.frequency.value = trackData.effectValues.filterCutoff;
                      filterCutoffSlider.value = trackData.effectValues.filterCutoff; // Wert im Schieberegler
                    }
                    track.pannerNode.pan.value = trackData.effectValues.panning;

                    // ... (andere Audio-Effekte) ...

                } else if (track.type === 'video' || track.type === 'image') {
                    // ... (Wiederherstellen der Werte für Helligkeit, Kontrast, etc.) ...

                    if(trackData.effectValues.brightness !== undefined){
                      brightnessSlider.value = trackData.effectValues.brightness
                    }
                    if(trackData.effectValues.contrast !== undefined){
                      contrastSlider.value = trackData.effectValues.contrast
                    }
                    if(trackData.effectValues.saturation !== undefined){
                      saturationSlider.value = trackData.effectValues.saturation
                    }
                    if(trackData.effectValues.hue !== undefined){
                      hueSlider.value = trackData.effectValues.hue
                    }
                    if(trackData.effectValues.transparency !== undefined){
                      transparencySlider.value = trackData.effectValues.transparency
                    }
                }

                updateTrackEffects(track.id); // *Nach* dem Wiederherstellen anwenden!

            }
            updateTrackDisplay(track);
        }

         updateTrackDisplay(track); // *Immer* aufrufen!
    }


    // --- Hilfsfunktion zum Erstellen eines neuen Track-Objekts ---
    function createTrack(file, type, audioBuffer, trackData) {
        const trackId = currentTrackId++;
        const url = URL.createObjectURL(file);  // URL für den Blob
        const trackElement = document.createElement('div');
        trackElement.classList.add('track');
        trackElement.id = `track-${trackId}`;
        trackElement.dataset.trackId = trackId; // ID für spätere Referenz
        trackElement.draggable = true; // Drag & Drop

        let mediaElement = null;
        let sourceNode = null;

        if (type === 'audio' || type === 'video') {
            mediaElement = document.createElement(type); // <audio> oder <video>
            mediaElement.src = url;
            mediaElement.controls = false; // Eigene Controls
            trackElement.appendChild(mediaElement);

            sourceNode = audioContext.createMediaElementSource(mediaElement); // Für Effekte

        } else if (type === 'image') {
            const imgElement = document.createElement('img');
            imgElement.src = url;
            trackElement.appendChild(imgElement);
            mediaElement = imgElement; // Einheitliche Variable
        }

        // Audio-Nodes (nur *einmal* erstellen!)
        const gainNode = audioContext.createGain();
        const pannerNode = audioContext.createStereoPanner();
        const filterNode = audioContext.createBiquadFilter(); //hinzugefügt

        //Verbinden für alle hörbaren Elemente
        if (sourceNode) {
            sourceNode.connect(gainNode);
            gainNode.connect(pannerNode);
            pannerNode.connect(filterNode)
            filterNode.connect(audioContext.destination);
            //Verbinde mit analyser Node für alle hörbaren Tracks
            //pannerNode.connect(analyser); //Verbindung für Frequenzdaten
        }
         //Anfangswerte setzen
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 350;


        const track = {
            id: trackId,
            type: type,
            src: url,
            audioBuffer: audioBuffer || null, // Kann null sein (bei Video/Bild)
            startTime: (trackData && trackData.startTime) || 0,
            duration: (trackData && trackData.duration) || 0, // Standardwert
            element: trackElement,
            mediaElement: mediaElement,
            sourceNode: sourceNode,
            gainNode: gainNode,
            pannerNode: pannerNode,
            filterNode: filterNode,
            analyserNode: type === 'audio' || type === 'video' ? analyser : null, // Optional
            effectValues: { // Anfangswerte (später wichtig für Speichern/Laden/Undo)
                volume: 1,
                panning: 0, //hinzugefügt
                brightness: 1,
                contrast: 1,
                saturation: 1,
                hue: 0,
                transparency: 1,
                filterType: 'lowpass', //hinzugefügt
                filterCutoff: 350 //hinzugefügt
            },
              muted: false, // Hinzugefügt: Spur stummgeschaltet?
              solo: false, // Hinzugefügt:  Spur im Solo-Modus?
        };

        return track;
    }


    // --- Funktion zum Aktualisieren der visuellen Darstellung einer Spur ---
    function updateTrackDisplay(track) {
        if (!track || !track.element) {
            console.warn("updateTrackDisplay aufgerufen mit ungültigem Track-Objekt:", track);
            return; // Frühzeitiger Abbruch
        }

        track.element.style.left = `${track.startTime * 50 * zoomLevel}px`;
        track.element.style.width = `${track.duration * 50 * zoomLevel}px`;

        // Stelle sicher, dass effectValues initialisiert ist
        if (!track.effectValues) {
            track.effectValues = {}; // Initialisieren, falls nicht vorhanden
        }

        // Wende visuelle Effekte an (Video/Bild)
        if (track.type === 'video' || track.type === 'image') {
            let filterString = '';
            filterString += `brightness(${track.effectValues.brightness || 1}) `; // Standardwert 1
            filterString += `contrast(${track.effectValues.contrast || 1}) `;
            filterString += `saturate(${track.effectValues.saturation || 1}) `;
            filterString += `hue-rotate(${track.effectValues.hue || 0}deg) `;
            // ... (weitere Filter) ...

            track.mediaElement.style.filter = filterString;
            track.mediaElement.style.opacity = track.effectValues.transparency || 1; // Standardwert 1

        } else if (track.type === 'audio') {
            // Stelle sicher, dass gainNode initialisiert ist (sollte es sein, aber sicher ist sicher)
            if (!track.gainNode) {
                console.warn("gainNode nicht initialisiert für Track:", track);
                return; // Abbruch, wenn gainNode fehlt
            }
            // Aktualisiere Lautstärke/Panning
            track.gainNode.gain.value = track.effectValues.volume || 1;
            track.pannerNode.pan.value = track.effectValues.panning || 0;
            //FilterNodes, wenn vorhanden
            if(track.filterNode){
              track.filterNode.type = track.effectValues.filterType || 'lowpass';
              track.filterNode.frequency.value = track.effectValues.filterCutoff || 350;
            }
        }
    }


    // --- Audio-Nodes verbinden (wichtig für Effekte) ---
    function connectTrackNodes(track) {
      if (!track.sourceNode || !track.gainNode || !track.pannerNode) {
          console.warn("Kann Audio-Nodes nicht verbinden, da nicht alle Nodes vorhanden sind:", track);
          return; // Frühzeitiger Abbruch
        }
        // Stelle sicher, dass die Nodes nicht bereits verbunden sind, um Fehler zu vermeiden
        track.sourceNode.disconnect();
        track.gainNode.disconnect();
        track.pannerNode.disconnect();

        // Verbinde die Nodes in der richtigen Reihenfolge
        track.sourceNode.connect(track.gainNode);
        track.gainNode.connect(track.pannerNode);
        track.pannerNode.connect(track.filterNode)
        track.filterNode.connect(audioContext.destination); // Immer mit dem *globalen* Kontext!
    }

      // --- Auswahl ---

    function selectTrack(trackId, event) {
        const trackElement = document.getElementById(`track-${trackId}`);
        if (!trackElement) {
            return;
        }

        if (!event.shiftKey) {
            deselectAllTracks();
        }

        if (selectedTracks.includes(trackId)) {
            selectedTracks = selectedTracks.filter(id => id !== trackId);
            trackElement.classList.remove('selected');
        } else {
            selectedTracks.push(trackId);
            trackElement.classList.add('selected');
        }
        updateTrackControls(); // Aktualisiere die Spur-Einstellungen
    }

    function deselectAllTracks() {
        selectedTracks.forEach(trackId => {
            const trackElement = document.getElementById(`track-${trackId}`);
            if (trackElement) {
                trackElement.classList.remove('selected');
            }
        });
        selectedTracks = [];
    }


     // --- Spur-Einstellungen anzeigen/aktualisieren ---

    function updateTrackControls() {
        if (selectedTracks.length > 0) {
            // *Eine* ausgewählte Spur
            const trackId = selectedTracks[0];
            const track = tracks.find(t => t.id === trackId);

            if (track) {
                // Werte aus dem Track-Objekt in die Regler übernehmen
                volumeSlider.value = track.effectValues.volume;
                if (track.type === 'audio') {
                    panningSlider.value = track.effectValues.panning;
                    filterTypeSelect.value = track.effectValues.filterType;
                    filterCutoffSlider.value = track.effectValues.filterCutoff;
                } else {
                    brightnessSlider.value = track.effectValues.brightness;
                    contrastSlider.value = track.effectValues.contrast;
                    saturationSlider.value = track.effectValues.saturation;
                    hueSlider.value = track.effectValues.hue;
                    transparencySlider.value = track.effectValues.transparency;
                }

                trackControls.style.display = 'block'; // Anzeigen
            }
        } else {
            // Keine Spur ausgewählt -> Bedienelemente ausblenden
            trackControls.style.display = 'none';
        }
    }

    // --- Event-Listener für die Spur-Einstellungsregler ---

    volumeSlider.addEventListener('input', () => {
       for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'volume', parseFloat(volumeSlider.value));
      }
    });

    panningSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'panning', parseFloat(panningSlider.value));
      }
    });

    brightnessSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'brightness', parseFloat(brightnessSlider.value));
      }
    });
    contrastSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'contrast', parseFloat(contrastSlider.value));
      }
    });
    saturationSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
         updateTrackEffects(trackId, 'saturation', parseFloat(saturationSlider.value));
      }
    });
    hueSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'hue', parseFloat(hueSlider.value));
      }
    });
    transparencySlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'transparency', parseFloat(transparencySlider.value));
      }
    });
      filterTypeSelect.addEventListener('change', () => {
        for (const trackId of selectedTracks){
          updateTrackEffects(trackId, 'filterType', filterTypeSelect.value);
        }
    });

    filterCutoffSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'filterCutoff', parseFloat(filterCutoffSlider.value));
      }
    });



    // --- Funktion zum Anwenden/Aktualisieren der Effekte ---
    function updateTrackEffects(trackId, effectType, value) {
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;

        // Speichere Wert im effectValues-Objekt
        track.effectValues[effectType] = value;

        // Wende Effekt an
        if (track.type === 'audio') {
            // Audio-Effekte (Web Audio API)
            switch (effectType) {
                case 'volume':
                    track.gainNode.gain.value = value; //Direkt ändern
                    break;
                case 'panning':
                    track.pannerNode.pan.value = value; // Direkt ändern
                    break;
                case 'filterType':
                  track.filterNode.type = value;
                  break;
                case 'filterCutoff':
                  track.filterNode.frequency.value = value;
                  break;
            }
              connectTrackNodes(track); // Nodes verbinden
        } else if (track.type === 'video' || track.type === 'image') {
            // Video/Bild-Effekte (CSS-Filter)
          let filterString = '';
            filterString += `brightness(${track.effectValues.brightness || 1}) `;
            filterString += `contrast(${track.effectValues.contrast || 1}) `;
            filterString += `saturate(${track.effectValues.saturation || 1}) `;
            filterString += `hue-rotate(${track.effectValues.hue || 0}deg) `;
            // ... (weitere Filter) ...

            track.mediaElement.style.filter = filterString;
            track.mediaElement.style.opacity = track.effectValues.transparency || 1; // Deckkraft/Transparenz
        }
        updateTrackDisplay(track); // Zeitleiste aktualisieren (für visuelle Effekte)
    }


    // --- Abspielcursor ---
    function updateCursor() {
        if (isPlaying && audioContext) {
            const currentTime = audioContext.currentTime; // Aktuelle Zeit im AudioContext
            cursor.style.left = `${currentTime * 50 * zoomLevel}px`; // Umrechnung in Pixel
            requestAnimationFrame(updateCursor); // Nächsten Frame anfordern
        }
    }


    // --- Funktion zum Abspielen/Pausieren ---
    function togglePlayPause() {
        if (isPlaying) {
            // Pause
            if (audioContext.state === 'running') {
                audioContext.suspend().then(() => {
                  isPlaying = false;
                  playPauseBtn.textContent = 'Play';
                });
            }
        } else {
            // Play
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    isPlaying = true;
                    playPauseBtn.textContent = 'Pause';
                    updateCursor(); //Cursorbewegung starten

                     // Starte Medienwiedergabe für alle Spuren
                    for (const track of tracks) {
                        if (track.mediaElement && (track.type === 'audio' || track.type === 'video')) {
                          const timelinePosition = parseFloat(track.element.style.left) / (50 * zoomLevel); //Absolute Position in Sekunden
                          const startTime = Math.max(0, audioContext.currentTime - (track.startTime + timelinePosition)); // Stelle sicher, dass startTime nicht negativ ist
                            track.mediaElement.currentTime = startTime;
                            track.mediaElement.play().catch(err => {
                                console.error(`Fehler beim Abspielen von ${track.type} (Track ID ${track.id}):`, err);
                            });
                        }
                    }
                });
            } else if (audioContext.state === 'closed') {
                // Behandle den Fall, dass der AudioContext geschlossen wurde (z.B. durch eine frühere Aktion)
                audioContext = new(window.Audio
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                isPlaying = true;
                playPauseBtn.textContent = 'Pause';
                updateCursor();

                // Starte die Medienwiedergabe für alle sichtbaren Spuren
                for (const track of tracks) {
                    if (track.mediaElement && (track.type === 'audio' || track.type === 'video')) {
                        //Berechne Abspielzeit
                        const timelinePosition = parseFloat(track.element.style.left) / (50 * zoomLevel); //Rechne zurück
                        const startTime = Math.max(0, audioContext.currentTime - timelinePosition); //Berechne
                        track.mediaElement.currentTime = startTime; //setzte abspielposition
                        track.mediaElement.play().catch(err => { //Fehler abfangen
                            console.error('Fehler beim Abspielen von', track.type, ':', err);
                        });
                    }
                }
            }
        }
    }


    // --- Schneiden ---
    async function cutSelectedTracks() {
        if (selectedTracks.length === 0) return;

        saveStateForUndo(); // Vor der Änderung speichern

        const cutPosition = parseFloat(cursor.style.left) / (50 * zoomLevel);  // Pixel in Sekunden

        // Stelle sicher, dass die Tracks in der richtigen Reihenfolge sind
        const sortedTracks = [...selectedTracks].sort((a,b) => {
        return tracks.findIndex(track => track.id === a) - tracks.findIndex(track => track.id ===b)
        })

        for (const trackId of sortedTracks) {
            await cutTrack(trackId, cutPosition); //Das await ist wichtig!
        }
    }

    async function cutTrack(trackId, position) {
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;

        const originalUrl = track.src; //wichtig für das richtige zuschneiden
        const originalBlob = await getBlobFromUrl(originalUrl); // Funktion von vorheriger Antwort

        if (!originalBlob) {
            console.error("Blob konnte nicht (erneut) geladen werden. Schneiden nicht möglich.");
            return;
        }
        const cutTime = position; //  Pixel nicht mehr in Sekunden umrechnen.

        if (track.type === 'audio') {
            //Audio schneiden
            const originalBuffer = await audioContext.decodeAudioData(await originalBlob.arrayBuffer());
            // 1. Teile den originalBuffer in zwei Teile
            const firstBuffer = audioContext.createBuffer(
                originalBuffer.numberOfChannels,
                Math.floor(cutTime * originalBuffer.sampleRate),
                originalBuffer.sampleRate
            );

            const secondBuffer = audioContext.createBuffer(
                originalBuffer.numberOfChannels,
                originalBuffer.length - Math.floor(cutTime * originalBuffer.sampleRate),
                originalBuffer.sampleRate
            );

            // Kopiere die Daten
            for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
                const originalData = originalBuffer.getChannelData(channel);
                const firstData = firstBuffer.getChannelData(channel);
                const secondData = secondBuffer.getChannelData(channel);

                firstData.set(originalData.subarray(0, Math.floor(cutTime * originalBuffer.sampleRate)));
                secondData.set(originalData.subarray(Math.floor(cutTime * originalBuffer.sampleRate)));

            }

            //Funktion zum konvertieren von Audiobuffer zu Blob
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


            // Erstelle neue Blobs und URLs
            const firstBlob = await audioBufferToBlob(firstBuffer);
            const firstUrl = URL.createObjectURL(firstBlob);

            const secondBlob = await audioBufferToBlob(secondBuffer);
            const secondUrl = URL.createObjectURL(secondBlob);

            // 2. Ersetze den ursprünglichen Track durch die zwei neuen
            //wavesurfer Instanz updaten und löschen
            if (wavesurferInstances[trackId]) {
                wavesurferInstances[trackId].destroy(); // Zerstöre die alte Wavesurfer-Instanz
                delete wavesurferInstances[trackId]; // Lösche sie aus dem Objekt
            }
            const newTrack = { ...track, src: firstUrl, duration: firstBuffer.duration, element: null }; //  element: null, wird neu erstellt
            tracks.splice(tracks.indexOf(track), 1, newTrack); // Ersetzen

            const secondTrack = {
                ...track, // Kopie aller Eigenschaften
                id: currentTrackId++, // Neue ID!
                src: secondUrl,
                startTime: track.startTime + cutTime,
                duration: secondBuffer.duration,
                element: null,
            };
            tracks.push(secondTrack);

            // Alte URL freigeben (WICHTIG!)
            URL.revokeObjectURL(track.src);

            // 3. Zeitleiste aktualisieren (DOM)
            track.element.remove();
            addMediaToTimeline(firstBlob, 'audio', firstBuffer, newTrack);
            addMediaToTimeline(secondBlob, 'audio', secondBuffer, secondTrack);

        } else if (track.type === 'video') {
            //Video schneiden

            const originalVideo = document.createElement('video');
            originalVideo.src = track.src;
            await originalVideo.play(); // Warten, bis das Video geladen ist
            // 1. Bestimme die Frame-Rate (vereinfacht)
            const frameRate = 30; //  Annäherung, da exakte Bestimmung im Browser schwierig ist

            // 2. Berechne die Frame-Nummer für den Schnitt
            const cutFrame = Math.floor(cutTime * frameRate);

            // 3. Erstelle zwei MediaRecorder
            const firstRecorder = new MediaRecorder(originalVideo.captureStream());
            const secondRecorder = new MediaRecorder(originalVideo.captureStream());

            // 4. Arrays für die Daten
            const firstChunks = [];
            const secondChunks = [];

            // 5. Event-Handler für die Recorder
            firstRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    firstChunks.push(event.data);
                }
            };
            secondRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    secondChunks.push(event.data);
                }
            };

            // 6. Starte die Aufnahme, stoppe nach der berechneten Zeit

            //Promise für setTimeOut
            function wait(ms) {
                return new Promise(resolve => setTimeout(resolve, ms));
            }

            firstRecorder.start();
            await wait(cutTime * 1000); //Zeit berechnen
            firstRecorder.stop(); // Stoppe den ersten Recorder nach cutTime Sekunden

            secondRecorder.start(); // Starte den zweiten Recorder sofort
            originalVideo.currentTime = cutTime; // Springe im Originalvideo zur cutTime
            await wait((originalVideo.duration - cutTime) * 1000) //solange aufnehmen bis das Ursprungsvideo zu Ende ist
            secondRecorder.stop();



            // 7. Erstelle Blobs aus den Daten
            const firstBlob = new Blob(firstChunks, { type: 'video/webm' });
            const secondBlob = new Blob(secondChunks, { type: 'video/webm' });

            // URLs erstellen (für die spätere Verwendung)
            const firstUrl = URL.createObjectURL(firstBlob);
            const secondUrl = URL.createObjectURL(secondBlob);

            // 8. Ersetze den ursprünglichen Track durch die zwei neuen
            //wavesurfer Instanz updaten und löschen, falls vorhanden
            if (wavesurferInstances[trackId]) {
                wavesurferInstances[trackId].destroy(); // Zerstöre die alte Wavesurfer-Instanz
                delete wavesurferInstances[trackId]; // Lösche sie aus dem Objekt
            }

            const newTrack = { ...track, src: firstUrl, duration: cutTime, element: null }; //  element: null
            tracks.splice(tracks.indexOf(track), 1, newTrack); // Ersetzen

            const secondTrack = {
                ...track, // Kopie aller Eigenschaften
                id: currentTrackId++, // Neue ID!
                src: secondUrl,
                startTime: track.startTime + cutTime,
                duration: track.duration - cutTime,
                element: null,
            };
            tracks.push(secondTrack);
            // Alte URL freigeben (WICHTIG!)
            URL.revokeObjectURL(track.src);

            // 9. Zeitleiste aktualisieren (DOM)
            track.element.remove();
            addMediaToTimeline(firstBlob, 'video', null, newTrack); //Ersten Track hinzufügen
            addMediaToTimeline(secondBlob, 'video', null, secondTrack); // Zweiten Track hinzufügen


        } else if (track.type === 'image') {
            // Bilder können nicht geschnitten werden, lösche die Spur
            deleteTrack(trackId);
        }
    }

    // --- Löschen ---

    function deleteSelectedTracks() {
        if (selectedTracks.length === 0) return;

          saveStateForUndo(); // Vor der Änderung speichern

        // Erstelle eine Kopie, um Probleme beim Iterieren zu vermeiden
        const tracksToDelete = [...selectedTracks];

        for (const trackId of tracksToDelete) {
            deleteTrack(trackId);
        }
        selectedTracks = [];       // Auswahl leeren
        updateTrackControls();     // Bedienelemente ausblenden
    }

    function deleteTrack(trackId) {
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;

        // DOM-Element entfernen
        track.element.remove();

        // Wavesurfer-Instanz zerstören (falls vorhanden)
        if (wavesurferInstances[trackId]) {
            wavesurferInstances[trackId].destroy();
            delete wavesurferInstances[trackId];
        }

        // URL freigeben
        URL.revokeObjectURL(track.src);

        // Track aus dem Array entfernen
        tracks = tracks.filter(t => t.id !== trackId);
    }
    // --- Kopieren ---

    function copySelectedTrack() {
        if (selectedTracks.length === 0) return;
        const trackId = selectedTracks[0]; //Nimmt nur eine Spur
        const track = tracks.find((t) => t.id === trackId);

        if (track) {
          // Erstelle eine *tiefe* Kopie des Track-Objekts
          copiedTrack = JSON.parse(JSON.stringify(track)); // Klone das Objekt
           copiedTrack.id = currentTrackId++; // Wichtig: Neue ID, um Konflikte zu vermeiden!
        }
    }

    // --- Einfügen ---
    function pasteCopiedTrack() {
        if (!copiedTrack) return;

          saveStateForUndo(); // Vor der Änderung speichern

        // Erstelle eine *tiefe* Kopie des kopierten Tracks
        const newTrack = JSON.parse(JSON.stringify(copiedTrack));

        // Aktualisiere ID und Element, um Konflikte zu vermeiden
        newTrack.id = currentTrackId++;
        newTrack.element = null; // Wird in addMediaToTimeline neu erstellt.
        newTrack.startTime = parseFloat(cursor.style.left) / (50 * zoomLevel); // Neue Startzeit (Cursorposition)

        // Erstelle einen neuen Blob und eine neue URL für die kopierte Spur
        getBlobFromUrl(copiedTrack.src).then(originalBlob => { //Blob laden
            if (!originalBlob) {
                console.error('Original Blob nicht gefunden');
                return;
            }

            const newBlob = new Blob([originalBlob], { type: originalBlob.type }); //neuer Blob
            const newUrl = URL.createObjectURL(newBlob); //neue URL
            newTrack.src = newUrl;

            if (newTrack.type === 'audio') { //neuen Audiobuffer erstellen
                getAudioBufferFromFile(newBlob).then(audioBuffer => {
                    newTrack.audioBuffer = audioBuffer;
                    addMediaToTimeline(newBlob, 'audio', audioBuffer, newTrack);
                    tracks.push(newTrack); // Füge die *neue* Spur zum tracks-Array hinzu
                });
            } else { //Falls Video oder Bild
                addMediaToTimeline(newBlob, newTrack.type, null, newTrack);
                tracks.push(newTrack); // Füge die *neue* Spur zum tracks-Array hinzu
            }
        });
    }

    // --- Rückgängig/Wiederholen ---
    function saveStateForUndo() {
      // Zustand speichern
       const currentState = {
        tracks: JSON.parse(JSON.stringify(tracks)), // Tiefe Kopie der Spuren
        // Weitere relevante Zustandsdaten (z.B. zoomLevel, selectedTracks)
        zoomLevel: zoomLevel,
        selectedTracks: [...selectedTracks], // Kopie des Arrays

    };
      undoStack.push(currentState);
       if (undoStack.length > MAX_UNDO_STATES) {
          undoStack.shift(); // Älteste Zustände entfernen
        }
        redoStack = []; // Redo-Stack leeren
    }

    function undo() {
      if (undoStack.length === 0) return;

        const previousState = undoStack.pop(); // Letzten Zustand holen
        redoStack.push(getCurrentState()); // Aktuellen Zustand auf den Redo-Stack

        // Zustand wiederherstellen
        restoreState(previousState);
    }

    function redo() {
        if (redoStack.length === 0) return;

        const nextState = redoStack.pop(); // Nächsten Zustand holen
        undoStack.push(getCurrentState()); // Aktuellen Zustand auf den Undo-Stack

        // Zustand wiederherstellen
        restoreState(nextState);

    }
     //Helfer Funktion um aktuellen Zustand zu bekommen
    function getCurrentState() {
        return {
            tracks: JSON.parse(JSON.stringify(tracks)), // Tiefe Kopie der Spuren
            zoomLevel: zoomLevel,
            selectedTracks: [...selectedTracks],
        };
    }

    // Funktion, um den Zustand wiederherzustellen
    function restoreState(state) {
      // 1. Alles zurücksetzen
        clearTimeline();

        // 2. Zustand wiederherstellen
        zoomLevel = state.zoomLevel;
        selectedTracks = state.selectedTracks;

        // 3. Spuren wiederherstellen (asynchron, da Blobs geladen werden müssen)
        const loadPromises = state.tracks.map(trackData => {
            return getBlobFromUrl(trackData.src)
                .then(blob => {
                    if (!blob) {
                        console.error("Blob konnte nicht wiederhergestellt werden:", trackData.src);
                        return; // Fehler, aber weiter mit den anderen Spuren
                    }

                   const file = new File([blob], "media-file", { type: blob.type }); // File-Objekt erstellen

                    // Füge die Spur hinzu *ohne* erneutes Laden der Metadaten
                    if (trackData.type === 'audio') {
                      // Erstelle AudioBuffer *synchron* aus den gespeicherten Daten (falls vorhanden)
                        let audioBuffer = null;
                        if (trackData.audioBuffer) {
                            audioBuffer = audioContext.createBuffer(
                                trackData.audioBuffer.numberOfChannels,
                                trackData.audioBuffer.length,
                                trackData.audioBuffer.sampleRate
                            );
                            for (let i = 0; i < trackData.audioBuffer.numberOfChannels; i++) {
                                 audioBuffer.getChannelData(i).set(trackData.audioBuffer.channelData[i]);
                            }
                        }
                      addMediaToTimeline(file, 'audio', audioBuffer, trackData);
                    } else{
                      addMediaToTimeline(file, trackData.type, null, trackData); // Kein AudioBuffer für Video/Bild
                    }
                });
        });

        // Warten, bis *alle* Spuren geladen wurden
         Promise.all(loadPromises).then(() => {
            // UI aktualisieren (Zoom, Auswahl, etc.)
            updateZoom();
            updateTrackControls(); // Zeige die Einstellungen der ersten ausgewählten Spur an (falls vorhanden)
        });
    }

     function clearTimeline() {
        // Alle Spuren entfernen (DOM)
        audioTracksContainer.innerHTML = '';
        videoTracksContainer.innerHTML = '';
        imageTracksContainer.innerHTML = '';


        // Wavesurfer-Instanzen zerstören
         for (const trackId in wavesurferInstances) {
            if (wavesurferInstances.hasOwnProperty(trackId)) {
                wavesurferInstances[trackId].destroy();
            }
        }
        wavesur
        wavesurferInstances = {};

        // URLs freigeben (Speicherleck verhindern!)
        for (const track of tracks) {
            URL.revokeObjectURL(track.src);
        }

        // Tracks-Array leeren
        tracks = [];
        currentTrackId = 0; // Track-ID zurücksetzen
        selectedTracks = [];   // Auswahl zurücksetzen
    }

    // --- Zoom ---
    //Debounce Funktion, damit nicht zu viele Events gefeuert werden.
    const debouncedZoom = debounce(updateZoom, 200);

    zoomInBtn.addEventListener('click', () => {
    zoomLevel *= 1.2;
    debouncedZoom();
    });

    zoomOutBtn.addEventListener('click', () => {
    zoomLevel /= 1.2;
    debouncedZoom();
    });
    function updateZoom() {
        // Begrenze den Zoom-Level (optional)
        zoomLevel = Math.max(0.5, Math.min(5, zoomLevel));

        // Aktualisiere die Breite aller Spuren
        for (const track of tracks) {
            updateTrackDisplay(track); // Nutze die existierende Funktion
        }
         // Cursorposition aktualisieren (wichtig nach dem Zoomen)
        const currentTime = audioContext.currentTime;
        cursor.style.left = `${currentTime * 50 * zoomLevel}px`;
    }

     // --- Timeline-Interaktion (Klicken) ---
     timeline.addEventListener('click', handleTimelineClick);

    function handleTimelineClick(event) {
        // Berechne die Klickposition relativ zur Timeline
        const timelineRect = timeline.getBoundingClientRect();
        const clickX = event.clientX - timelineRect.left;
        const clickTime = clickX / (50 * zoomLevel); // Pixel in Sekunden

        // Setze die Abspielposition im AudioContext
        if (audioContext.state === 'suspended') { //Context Zustand prüfen
            audioContext.resume().then(() => { //Wenn Suspended, dann fortsetzen
                audioContext.currentTime = clickTime;
            });
        } else {
          audioContext.currentTime = clickTime; //Setzte die Zeit im Audio Context
        }


        // Bewege den Cursor an die neue Position
        cursor.style.left = `${clickX}px`;

        // Starte die Wiedergabe, falls nicht schon aktiv
         if (!isPlaying) {
            togglePlayPause();
         }
    }

    // --- Drag & Drop (Verschieben von Spuren) ---

    let draggedTrack = null; // Das aktuell gezogene Track-Objekt

     // Funktion zum Starten des Ziehvorgangs
    function handleDragStart(event) {
        const trackId = parseInt(event.target.dataset.trackId);
        draggedTrack = tracks.find(t => t.id === trackId);

        if (!draggedTrack) {
            event.preventDefault(); // Verhindere das Ziehen, wenn kein Track gefunden wurde
            return;
        }
        event.dataTransfer.setData('text/plain', trackId); // ID für den Drop-Event
        event.target.classList.add('dragging'); // Visuelles Feedback
    }
     // Funktion die Ausgeführt wird, wenn über die Timeline gezogen wird
    function handleDragOver(event) {
        event.preventDefault(); // Erlaube das Droppen
        // Verhindere das Standardverhalten (Öffnen der Datei)
    }

    // Funktion die ausgeführt wird, wenn losgelassen wird
    function handleDrop(event) {
        event.preventDefault();
        if (!draggedTrack) return;

        const trackId = parseInt(event.dataTransfer.getData('text/plain')); //String zu Nummer
        if (isNaN(trackId)) return; // Stelle sicher, dass die ID eine Zahl ist.

        const dropTarget = event.target.closest('.timeline'); // Stelle sicher, dass über der Timeline gedroppt wird
        if (!dropTarget) {
            draggedTrack.element.classList.remove('dragging'); // Entferne die Klasse
            draggedTrack = null;
            return; //Frühzeitiger Abbruch
        }

        // Berechne die neue Startzeit basierend auf der Mausposition
        const timelineRect = timeline.getBoundingClientRect(); //Position und Größe der Timeline
        let newStartTime = (event.clientX - timelineRect.left) / (50 * zoomLevel); // Neue Startzeit in Sekunden

        // Einrasten am Raster (optional)
        if (snapToGrid) {
            newStartTime = Math.round(newStartTime / 0.5) * 0.5; //  0.5 Sekunden Raster
        }
         newStartTime = Math.max(0, newStartTime); //Verhindere negative Zeiten

        // Aktualisiere die Startzeit des Tracks
        draggedTrack.startTime = newStartTime;
        updateTrackDisplay(draggedTrack); // Zeitleiste neu zeichnen

        draggedTrack.element.classList.remove('dragging');
        draggedTrack = null; // Zurücksetzen
        saveStateForUndo();
    }

     // Event-Listener für die Spuren hinzufügen (beim Erstellen der Spur!)
    function addTrackEventListeners(track) {
        track.element.addEventListener('dragstart', handleDragStart);
    }



    // --- Bereichsauswahl (Drag-Selection) ---
     //Mousedown Event
    timeline.addEventListener('mousedown', (event) => {
        if (!selectionDiv) { //Div erstellen, wenn noch nicht vorhanden
            selectionDiv = document.createElement('div');
            selectionDiv.classList.add('selection-box');
            timeline.appendChild(selectionDiv); // Einmalig hinzufügen
        }
        isDragging = true; //Starte Dragging Modus
        dragStartX = event.clientX - timeline.getBoundingClientRect().left; // X-Position relativ zur Timeline

        //Setze Auswahl direkt an der richtigen Stelle
        selectionDiv.style.left = `${dragStartX}px`;
        selectionDiv.style.top = '0';
        selectionDiv.style.width = '0';
        selectionDiv.style.height = `${timeline.offsetHeight}px`; // Volle Höhe
        selectionDiv.style.display = 'block'; // Sichtbar machen
    });

    //Mousemove Event
    timeline.addEventListener('mousemove', (event) => {
        if (isDragging) {
            const currentX = event.clientX - timeline.getBoundingClientRect().left; // X-Position relativ zur Timeline
            const width = Math.abs(currentX - dragStartX); //Berechne Breite
            const left = Math.min(dragStartX, currentX); //Berechne linke Position
            selectionDiv.style.width = `${width}px`; //Setze Breite
            selectionDiv.style.left = `${left}px`; //Setze Position
        }
    });

    //Mouseup Event
    timeline.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false; // Beende Dragging-Modus
            selectionDiv.style.display = 'none'; // Ausblenden

            // -- Ausgewählte Spuren ermitteln --
            selectedTracks = []; // Vorherige Auswahl löschen!
            const selectionRect = selectionDiv.getBoundingClientRect(); // Rechteck der Auswahl

            // Gehe durch alle Spuren
            tracks.forEach(track => {
                const trackElement = track.element;
                const trackRect = trackElement.getBoundingClientRect();

                // Überprüfen, ob sich die Rechtecke überschneiden
                if (trackRect.left < selectionRect.right &&
                    trackRect.right > selectionRect.left &&
                    trackRect.top < selectionRect.bottom &&
                    trackRect.bottom > selectionRect.top) {
                    selectTrack(track.id) // Selektiere die Spur
                }

            });
        }
    });


    // --- Tastaturkürzel ---

    function handleKeyDown(event) {
        if (event.target.tagName.toLowerCase() === 'input' && event.target.type !== 'checkbox') {
               return; // Ignoriere Tastatureingaben in Input-Feldern (außer Checkboxen)
           }
        switch (event.key) {
            case ' ': // Leertaste
                togglePlayPause();
                event.preventDefault(); // Standardverhalten (Scrollen) verhindern
                break;
            case 'Delete': // Entfernen-Taste
            case 'Backspace':
                deleteSelectedTracks();
                break;
            case 'x':
            case 'X':
                cutSelectedTracks();
                break;
            case 'c': // Keine Modifikatortaste!
               if(event.ctrlKey || event.metaKey){
                copySelectedTrack();
               }
                break;
            case 'v': // Keine Modifikatortaste!
               if(event.ctrlKey || event.metaKey){
                pasteCopiedTrack();
               }
                break;
            case 'z':
               if(event.ctrlKey || event.metaKey){
                if (event.shiftKey) {
                    redo(); // Strg/Cmd + Shift + Z = Redo
                } else {
                    undo(); // Strg/Cmd + Z = Undo
                }
                event.preventDefault(); // Standardverhalten verhindern
               }
                break;
            case 'y': // Für Redo (auf einigen Tastaturen)
                if (event.ctrlKey || event.metaKey) {
                  redo();
                }
                break;
            case 's':
                if (event.ctrlKey || event.metaKey){
                  event.preventDefault(); // Verhindert das Standard-Speichern des Browsers
                  saveProject();
                }
                break;
            case 'ArrowLeft': // Pfeiltaste links
               if(isPlaying) return;
                moveCursor(-0.1); // Bewege den Cursor um 0.1 Sekunden zurück
                break;
            case 'ArrowRight': // Pfeiltaste rechts
               if(isPlaying) return;
                moveCursor(0.1);  // Bewege den Cursor um 0.1 Sekunden vor
                break;

             //Zoom
            case '+':
              if (event.ctrlKey || event.metaKey){
                zoomLevel *= 1.2;
                updateZoom();
                event.preventDefault();
              }
              break;
            case '-':
               if (event.ctrlKey || event.metaKey){
                zoomLevel /= 1.2;
                updateZoom();
                event.preventDefault();
               }
              break;

        }
    }
     // Funktion, um den Cursor zu bewegen
      function moveCursor(delta) {  // delta = Zeitdifferenz in Sekunden
        const currentPosition = parseFloat(cursor.style.left || 0); // Aktuelle Position in Pixeln
        let newPosition = currentPosition + (delta * 50 * zoomLevel);     // Neue Position in Pixeln
        newPosition = Math.max(0,newPosition) //Nicht kleiner als Null

        cursor.style.left = `${newPosition}px`; // Setze die neue Position
      }


    // --- Mausrad (Zoom) ---
    //Debounce Funktion, damit nicht zu viele Events gefeuert werden.
    const debouncedUpdateZoom = debounce(updateZoom, 50);

    function handleTimelineWheel(event) {
        event.preventDefault(); // Standardverhalten (Scrollen) verhindern

        // Zoom-Faktor basierend auf der Mausrad-Richtung
        const delta = event.deltaY > 0 ? 0.9 : 1.1; // Mausrad nach unten/oben
        zoomLevel *= delta;
        debouncedUpdateZoom(); // Aufruf über die debounced-Funktion
    }

    // --- Touch-Events (Mobile) ---
      let touchStartX = 0; // Initial X-Position
      let initialLeft = 0; //  Startposition des Cursors

    function handleTouchStart(event) {
         if (event.touches.length === 1) { // Nur bei einem Finger
            touchStartX = event.touches[0].clientX;
            initialLeft = parseFloat(cursor.style.left || 0); // Aktuelle Cursorposition
             event.preventDefault(); // Standardverhalten verhindern
        }
    }

    function handleTouchMove(event) {
      if (event.touches.length === 1 && !isPlaying) { // Nur bei einem Finger und wenn nicht abgespielt wird
            const touchCurrentX = event.touches[0].clientX; // X Position des Fingers
            const deltaX = touchCurrentX - touchStartX;     // Differenz
            let newPosition = initialLeft + deltaX; //  Pixel-Wert

            // Stelle sicher, dass der Cursor nicht negativ wird
            newPosition = Math.max(0, newPosition);

            cursor.style.left = `${newPosition}px`;  // CSS-Eigenschaft direkt setzen
            event.preventDefault();  // Standardverhalten verhindern
        }
    }

    function handleTouchEnd(event) {
       // Hier könnte Logik für Aktionen nach dem Loslassen implementiert werden (z.B. Auswahl)
    }

    // --- Web Worker Nachrichten-Handling ---
    audioWorker.onmessage = (event) => {
        if (event.data.type === 'keyResult') {
            console.log('Erkannte Tonart (vom Worker):', event.data.key);
             alert(`Erkannte Tonart: ${event.data.key.tonic} ${event.data.key.type}`); // Direkte Anzeige

        } else if (event.data.type === 'bpmResult') {
            console.log('Erkanntes BPM (vom Worker):', event.data.bpm);
           alert(`Erkanntes Tempo: ${event.data.bpm.toFixed(2)} BPM`); // Auf 2 Dezimalstellen runden

        } else if (event.data.type === 'audioBuffer') {
            // Konvertiere empfangene Daten in AudioBuffer
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
        } else if (event.data.type === 'mp3Blob'){
          //Verarbeite den fertigen mp3 Blob
          const blob = event.data.mp3Blob;
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); //Link erstellen
          a.href = url;
          a.download = 'exported_audio.mp3';
          document.body.appendChild(a);
          a.click(); //Simuliere Klick
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
    };
     // --- Audio-Kontext fortsetzen (für Autoplay-Richtlinien) ---
    function resumeAudioContext() {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
    // Stelle sicher, dass der AudioContext fortgesetzt wird, wenn eine Benutzerinteraktion stattfindet
    document.addEventListener('click', resumeAudioContext);
    document.addEventListener('keydown', resumeAudioContext);
    document.addEventListener('touchstart', resumeAudioContext, { passive: true });

    //Aufrufe der Funktionen kommen hier    // --- Hinzufügen von Event-Listenern für die Spuren *innerhalb* von createTrack ---
    function createTrack(file, type, audioBuffer, trackData) {
      // ... (vorheriger Code) ...

      const track = {
        // ... (vorherige Eigenschaften) ...
        id: trackId,
        type: type,
        src: url,
        audioBuffer: audioBuffer || null, // Kann null sein (bei Video/Bild)
        startTime: (trackData && trackData.startTime) || 0, // Wichtig für Position!
        duration: (trackData && trackData.duration) || 0, // Standardwert
        element: trackElement,
        mediaElement: mediaElement,
        sourceNode: sourceNode,
        gainNode: gainNode,
        pannerNode: pannerNode,
        filterNode: filterNode, //hinzugefügt
        analyserNode: type === 'audio' || type === 'video' ? analyser : null, // Optional
        effectValues: {
          volume: 1,
          panning: 0, //hinzugefügt
          brightness: 1,
          contrast: 1,
          saturation: 1,
          hue: 0,
          transparency: 1,
          filterType: 'lowpass', //hinzugefügt
          filterCutoff: 350 //hinzugefügt
        },
        muted: false, // Hinzugefügt: Spur stummgeschaltet?
        solo: false, // Hinzugefügt:  Spur im Solo-Modus?
      };

      // Event-Listener *hier* hinzufügen (innerhalb von createTrack):
      addTrackEventListeners(track);

      return track;
    }

    // --- Event-Listener für die Spuren hinzufügen ---
    function addTrackEventListeners(track) {
        track.element.addEventListener('dragstart', handleDragStart); // Verschieben
        track.element.addEventListener('click', (event) => { //Auswählen
            selectTrack(track.id, event);
        });
        // Weitere Listener hier hinzufügen (z.B. Doppelklick für Details, Kontextmenü, etc.)
    }

    // --- Update Track Display (angepasst) ---
    function updateTrackDisplay(track) {
      if (!track || !track.element) {
        console.warn("updateTrackDisplay aufgerufen mit ungültigem Track-Objekt:", track);
        return;
      }

      track.element.style.left = `${track.startTime * 50 * zoomLevel}px`;
      track.element.style.width = `${track.duration * 50 * zoomLevel}px`;


      // Stelle sicher, dass effectValues initialisiert ist
      if (!track.effectValues) {
        track.effectValues = {}; // Initialisieren, falls nicht vorhanden
      }

      // Wende visuelle Effekte an (Video/Bild)
      if (track.type === 'video' || track.type === 'image') {
        let filterString = '';
        filterString += `brightness(${track.effectValues.brightness || 1}) `;
        filterString += `contrast(${track.effectValues.contrast || 1}) `;
        filterString += `saturate(${track.effectValues.saturation || 1}) `;
        filterString += `hue-rotate(${track.effectValues.hue || 0}deg) `;
        // ... (weitere Filter) ...

        track.mediaElement.style.filter = filterString;
        track.mediaElement.style.opacity = track.effectValues.transparency || 1;

      } else if (track.type === 'audio') { //auch für Audio
        // Stelle sicher, dass gainNode initialisiert ist
        if (!track.gainNode) {
          console.warn("gainNode nicht initialisiert für Track:", track);
          return; // Abbruch
        }
        // Aktualisiere Lautstärke/Panning
        track.gainNode.gain.value = track.effectValues.volume || 1; //Verwendung von Defaultwerten
        track.pannerNode.pan.value = track.effectValues.panning || 0;
        //FilterNodes, wenn vorhanden
        if (track.filterNode) {
          track.filterNode.type = track.effectValues.filterType || 'lowpass';
          track.filterNode.frequency.value = track.effectValues.filterCutoff || 350;
        }
      }
    }


    // --- Audio-Nodes verbinden (angepasst) ---
    function connectTrackNodes(track) {
      if (!track.sourceNode) {
          console.warn("Kann Audio-Nodes nicht verbinden, da SourceNode nicht vorhanden ist:", track);
          return;
        }

        // Nodes nur erstellen, wenn sie nicht existieren.
        if (!track.gainNode) {
            track.gainNode = audioContext.createGain();
        }
        if (!track.pannerNode) {
            track.pannerNode = audioContext.createStereoPanner();
        }
        if (!track.filterNode) {
            track.filterNode = audioContext.createBiquadFilter();
        }

        // Stelle sicher, dass die Nodes nicht bereits verbunden sind
        track.sourceNode.disconnect();
        track.gainNode.disconnect();
        track.pannerNode.disconnect();
        track.filterNode.disconnect();


        // Verbinde die Nodes in der richtigen Reihenfolge
        track.sourceNode.connect(track.gainNode);
        track.gainNode.connect(track.pannerNode);
        track.pannerNode.connect(track.filterNode);
        track.filterNode.connect(audioContext.destination);
        //track.pannerNode.connect(analyser); //Verbindung zum Analyser Node für Visualisierung
    }


    // --- Auswahl ---

    function selectTrack(trackId, event) {
      const trackElement = document.getElementById(`track-${trackId}`);
      if (!trackElement) {
        return; // Track existiert nicht (mehr)
      }

      if (!event.shiftKey) {
        // Wenn die Shift-Taste *nicht* gedrückt ist, setze die Auswahl zurück
        deselectAllTracks();
      }

      // Füge die Spur zur Auswahl hinzu (oder entferne sie, wenn sie bereits ausgewählt ist)
      if (selectedTracks.includes(trackId)) {
        selectedTracks = selectedTracks.filter(id => id !== trackId); // Entfernen
        trackElement.classList.remove('selected');
      } else {
        selectedTracks.push(trackId); // Hinzufügen
        trackElement.classList.add('selected');
      }
      updateTrackControls(); // Aktualisiere die Spur-Einstellungen
    }

    function deselectAllTracks() {
      selectedTracks.forEach(trackId => {
        const trackElement = document.getElementById(`track-${trackId}`);
        if (trackElement) { //Sicherheitsprüfung
          trackElement.classList.remove('selected');
        }
      });
      selectedTracks = [];
    }


    // --- Spur-Einstellungen anzeigen/aktualisieren ---
    function updateTrackControls() {
        if (selectedTracks.length > 0) {
            // *Eine* ausgewählte Spur
            const trackId = selectedTracks[0];
            const track = tracks.find(t => t.id === trackId);

            if (track) {
                // Werte aus dem Track-Objekt in die Regler übernehmen
                volumeSlider.value = track.effectValues.volume;
                if (track.type === 'audio') {
                    panningSlider.value = track.effectValues.panning;
                      filterTypeSelect.value = track.effectValues.filterType;
                    filterCutoffSlider.value = track.effectValues.filterCutoff;
                } else {
                    brightnessSlider.value = track.effectValues.brightness;
                    contrastSlider.value = track.effectValues.contrast;
                    saturationSlider.value = track.effectValues.saturation;
                    hueSlider.value = track.effectValues.hue;
                    transparencySlider.value = track.effectValues.transparency;
                }

                trackControls.style.display = 'block'; // Anzeigen
            }
        } else {
            // Keine Spur ausgewählt -> Bedienelemente ausblenden
            trackControls.style.display = 'none';
        }
    }


       // --- Event-Listener für die Spur-Einstellungsregler ---
    // Stelle sicher, dass die Event-Listener *außerhalb* von addMediaToTimeline/createTrack sind!
    // *Einmalige* Zuweisung der Listener, *nicht* bei jeder Spurerstellung.

    volumeSlider.addEventListener('input', () => {
    for (const trackId of selectedTracks) {
        updateTrackEffects(trackId, 'volume', parseFloat(volumeSlider.value));
    }
    });

    panningSlider.addEventListener('input', () => {
    for (const trackId of selectedTracks) {
        updateTrackEffects(trackId, 'panning', parseFloat(panningSlider.value));
    }
    });

    brightnessSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'brightness', parseFloat(brightnessSlider.value));
      }
    });

    contrastSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'contrast', parseFloat(contrastSlider.value));
      }
    });

    saturationSlider.addEventListener('input', () => {
       for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'saturation', parseFloat(saturationSlider.value));
       }
    });

    hueSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'hue', parseFloat(hueSlider.value));
      }
    });

    transparencySlider.addEventListener('input', () => {
       for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'transparency', parseFloat(transparencySlider.value));
      }
    });
     filterTypeSelect.addEventListener('change', () => {
        for (const trackId of selectedTracks){
          updateTrackEffects(trackId, 'filterType', filterTypeSelect.value);
        }
    });

    filterCutoffSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks){
        updateTrackEffects(trackId, 'filterCutoff', parseFloat(filterCutoffSlider.value));
      }
    });



    // --- Funktion zum Anwenden/Aktualisieren der Effekte ---

    function updateTrackEffects(trackId, effectType, value) {
        const track = tracks.find(t => t.id === trackId);
        if (!track) return;

        // Speichere den neuen Wert im effectValues-Objekt (WICHTIG für Speichern/Laden!)
        track.effectValues[effectType] = value;

        // Wende den Effekt an (je nach Spurtyp)
        if (track.type === 'audio') {
            // Audio-Effekte (Web Audio API)
            switch (effectType) {
                case 'volume':
                    track.gainNode.gain.value = value;
                    break;
                case 'panning':
                    track.pannerNode.pan.value = value;
                    break;
                case 'filterType':
                  track.filterNode.type = value;
                  break;
                case 'filterCutoff':
                  track.filterNode.frequency.value = value;
                  break;
                // Weitere Audio-Effekte hier
            }
             connectTrackNodes(track); // Stelle sicher, dass die Nodes korrekt verbunden sind
        } else if (track.type === 'video' || track.type === 'image') {
            // Video/Bild-Effekte (CSS-Filter)
            let filterString = '';
            filterString += `brightness(${track.effectValues.brightness || 1}) `; // Immer Default-Werte
            filterString += `contrast(${track.effectValues.contrast || 1}) `;      // für fehlende Werte
            filterString += `saturate(${track.effectValues.saturation || 1}) `;    // verwenden!
            filterString += `hue-rotate(${track.effectValues.hue || 0}deg) `;
            // ... (weitere Filter) ...

            track.mediaElement.style.filter = filterString;
            track.mediaElement.style.opacity = track.effectValues.transparency || 1;
        }
         updateTrackDisplay(track); // Wichtig: Visuelle Darstellung aktualisieren
    }


    // --- Abspielcursor ---
    function updateCursor() {
        if (isPlaying && audioContext) {
            const currentTime = audioContext.currentTime;
            cursor.style.left = `${currentTime * 50 * zoomLevel}px`; // Skalierung
            requestAnimationFrame(updateCursor); // Nächsten Frame anfordern
        }
    }

    // --- Funktion zum Abspielen/Pausieren ---

    function togglePlayPause() {
        if (isPlaying) {
            // Pause
            if (audioContext.state === 'running') {
                audioContext.suspend().then(() => {
                    isPlaying = false;
                    playPauseBtn.textContent = 'Play';
                    // Keine Cursorbewegung mehr
                });
            }
        } else {
            // Play
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    isPlaying = true;
                    playPauseBtn.textContent = 'Pause';
                    updateCursor(); // Cursorbewegung starten

                    // Starte die Medienwiedergabe für *alle* Spuren
                    for (const track of tracks) {
                      if (track.mediaElement && (track.type === 'audio' || track.type === 'video')) {
                       const timelinePosition = parseFloat(track.element.style.left) / (50 * zoomLevel); // Absolute Position in Sekunden, durch Skalierungsfaktor
                        const startTime = Math.max(0, audioContext.currentTime - (track.startTime + timelinePosition)); // Stelle sicher, dass startTime nicht negativ ist
                        track.mediaElement.currentTime = startTime;
                        track.mediaElement.play().catch(err => {
                          console.error(`Fehler beim Abspielen von ${track.type} (Track ID ${track.id}):`, err);
                        });
                      }
                    }
                });
            } else if (audioContext.state === 'closed') {
               // Behandlung für den Fall, dass AudioContext geschlossen wurde
                audioContext = new(window.AudioContext || window.webkitAudioContext)();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                //Verbinden des Analysers, nötig?
                isPlaying = true;
                playPauseBtn.textContent = 'Pause';
                updateCursor(); // Cursorbewegung

                // Starte Medienwiedergabe für alle Spuren
                for (const track of tracks) {
                    if (track.mediaElement && (track.type === 'audio' || track.type === 'video')) {
                      const timelinePosition = parseFloat(track.element.style.left) / (50 * zoomLevel);
                      const startTime = Math.max(0, audioContext.currentTime - timelinePosition);
                        track.mediaElement.currentTime = startTime;
                        track.mediaElement.play().catch(err => {
                            console.error(`Fehler beim Abspielen von ${track.type} (Track ID ${track.id}):`, err);
                        });
                    }
                }
            }
        }
    }


    // --- Schneiden ---

    async function cutSelectedTracks() {
      if (selectedTracks.length === 0) return;

      saveStateForUndo(); // Vor der Änderung speichern

      const cutPosition = parseFloat(cursor.style.left) / (50 * zoomLevel);

      // Stelle sicher, dass die Tracks in der richtigen Reihenfolge sind
      const sortedTracks = [...selectedTracks].sort((a, b) => {
        return tracks.findIndex(track => track.id === a) - tracks.findIndex(track => track.id === b)
      })

      for (const trackId of sortedTracks) {
        await cutTrack(trackId, cutPosition); //Das await ist wichtig!
      }
    }

    async function cutTrack(trackId, position) {
      const track = tracks.find(t => t.id === trackId);
      if (!track) return;

      const originalUrl = track.src; //wichtig für das richtige zuschneiden
      const originalBlob = await getBlobFromUrl(originalUrl); // Funktion von vorheriger Antwort

      if (!originalBlob) {
        console.error("Blob konnte nicht (erneut) geladen werden. Schneiden nicht möglich.");
        return;
      }
      const cutTime = position;


      if (track.type === 'audio') {
        //Audio schneiden
        const originalBuffer = await audioContext.decodeAudioData(await originalBlob.arrayBuffer());
        // 1. Teile den originalBuffer in zwei Teile
        const firstBuffer = audioContext.createBuffer(
          originalBuffer.numberOfChannels,
          Math.floor(cutTime * originalBuffer.sampleRate),
          originalBuffer.sampleRate
        );

        const secondBuffer = audioContext.createBuffer(
          originalBuffer.numberOfChannels,
          originalBuffer.length - Math.floor(cutTime * originalBuffer.sampleRate),
          originalBuffer.sampleRate
        );

        // Kopiere die Daten
        for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
          const originalData = originalBuffer.getChannelData(channel);
          const firstData = firstBuffer.getChannelData(channel
          const secondData = secondBuffer.getChannelData(channel);

          firstData.set(originalData.subarray(0, Math.floor(cutTime * originalBuffer.sampleRate)));
          secondData.set(originalData.subarray(Math.floor(cutTime * originalBuffer.sampleRate)));

        }

        //Funktion zum konvertieren von Audiobuffer zu Blob
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


        // Erstelle neue Blobs und URLs
        const firstBlob = await audioBufferToBlob(firstBuffer);
        const firstUrl = URL.createObjectURL(firstBlob);

        const secondBlob = await audioBufferToBlob(secondBuffer);
        const secondUrl = URL.createObjectURL(secondBlob);

        // 2. Ersetze den ursprünglichen Track durch die zwei neuen
        //wavesurfer Instanz updaten und löschen
        if (wavesurferInstances[trackId]) {
          wavesurferInstances[trackId].destroy(); // Zerstöre die alte Wavesurfer-Instanz
          delete wavesurferInstances[trackId]; // Lösche sie aus dem Objekt
        }
        const newTrack = { ...track, src: firstUrl, duration: firstBuffer.duration, element: null }; //  element: null, wird neu erstellt
        tracks.splice(tracks.indexOf(track), 1, newTrack); // Ersetzen

        const secondTrack = {
          ...track, // Kopie aller Eigenschaften
          id: currentTrackId++, // Neue ID!
          src: secondUrl,
          startTime: track.startTime + cutTime,
          duration: secondBuffer.duration,
          element: null,
        };
        tracks.push(secondTrack);

        // Alte URL freigeben (WICHTIG!)
        URL.revokeObjectURL(track.src);

        // 3. Zeitleiste aktualisieren (DOM)
        track.element.remove();
        addMediaToTimeline(firstBlob, 'audio', firstBuffer, newTrack);
        addMediaToTimeline(secondBlob, 'audio', secondBuffer, secondTrack);

      } else if (track.type === 'video') {
        //Video schneiden

        const originalVideo = document.createElement('video');
        originalVideo.src = track.src;
        await originalVideo.play(); // Warten, bis das Video geladen ist
        // 1. Bestimme die Frame-Rate (vereinfacht)
        const frameRate = 30; //  Annäherung, da exakte Bestimmung im Browser schwierig ist

        // 2. Berechne die Frame-Nummer für den Schnitt
        const cutFrame = Math.floor(cutTime * frameRate);

        // 3. Erstelle zwei MediaRecorder
        const firstRecorder = new MediaRecorder(originalVideo.captureStream());
        const secondRecorder = new MediaRecorder(originalVideo.captureStream());

        // 4. Arrays für die Daten
        const firstChunks = [];
        const secondChunks = [];

        // 5. Event-Handler für die Recorder
        firstRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            firstChunks.push(event.data);
          }
        };
        secondRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            secondChunks.push(event.data);
          }
        };

        // 6. Starte die Aufnahme, stoppe nach der berechneten Zeit

        //Promise für setTimeOut
        function wait(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        firstRecorder.start();
        await wait(cutTime * 1000); //Zeit berechnen
        firstRecorder.stop(); // Stoppe den ersten Recorder nach cutTime Sekunden

        secondRecorder.start(); // Starte den zweiten Recorder sofort
        originalVideo.currentTime = cutTime; // Springe im Originalvideo zur cutTime
        await wait((originalVideo.duration - cutTime) * 1000) //solange aufnehmen bis das Ursprungsvideo zu Ende ist
        secondRecorder.stop();



        // 7. Erstelle Blobs aus den Daten
        const firstBlob = new Blob(firstChunks, { type: 'video/webm' });
        const secondBlob = new Blob(secondChunks, { type: 'video/webm' });

        // URLs erstellen (für die spätere Verwendung)
        const firstUrl = URL.createObjectURL(firstBlob);
        const secondUrl = URL.createObjectURL(secondBlob);

        // 8. Ersetze den ursprünglichen Track durch die zwei neuen
        //wavesurfer Instanz updaten und löschen, falls vorhanden
        if (wavesurferInstances[trackId]) {
          wavesurferInstances[trackId].destroy(); // Zerstöre die alte Wavesurfer-Instanz
          delete wavesurferInstances[trackId]; // Lösche sie aus dem Objekt
        }

        const newTrack = { ...track, src: firstUrl, duration: cutTime, element: null }; //  element: null
        tracks.splice(tracks.indexOf(track), 1, newTrack); // Ersetzen

        const secondTrack = {
          ...track, // Kopie aller Eigenschaften
          id: currentTrackId++, // Neue ID!
          src: secondUrl,
          startTime: track.startTime + cutTime,
          duration: track.duration - cutTime,
          element: null,
        };
        tracks.push(secondTrack);
        // Alte URL freigeben (WICHTIG!)
        URL.revokeObjectURL(track.src);

        // 9. Zeitleiste aktualisieren (DOM)
        track.element.remove();
        addMediaToTimeline(firstBlob, 'video', null, newTrack); //Ersten Track hinzufügen
        addMediaToTimeline(secondBlob, 'video', null, secondTrack); // Zweiten Track hinzufügen


      } else if (track.type === 'image') {
        // Bilder können nicht geschnitten werden, lösche die Spur
        deleteTrack(trackId);
      }
    }

    // --- Löschen ---

    function deleteSelectedTracks() {
      if (selectedTracks.length === 0) return;

      saveStateForUndo(); // Vor der Änderung speichern

      // Erstelle eine Kopie, um Probleme beim Iterieren zu vermeiden (wichtig!)
      const tracksToDelete = [...selectedTracks];

      for (const trackId of tracksToDelete) {
        deleteTrack(trackId);
      }

      selectedTracks = [];       // Auswahl leeren
      updateTrackControls();     // Bedienelemente ausblenden/aktualisieren
    }

    function deleteTrack(trackId) {
      const track = tracks.find(t => t.id === trackId);
      if (!track) return;

      // DOM-Element entfernen
      track.element.remove();

      // Wavesurfer-Instanz zerstören (falls vorhanden)
      if (wavesurferInstances[trackId]) {
        wavesurferInstances[trackId].destroy();
        delete wavesurferInstances[trackId];
      }

      // URL freigeben (WICHTIG: Speicherleck verhindern!)
      URL.revokeObjectURL(track.src);

      // Track aus dem Array entfernen
      tracks = tracks.filter(t => t.id !== trackId);
    }
    // --- Kopieren ---

    function copySelectedTrack() {
      if (selectedTracks.length === 0) return;
      const trackId = selectedTracks[0]; //Nimmt nur eine Spur
      const track = tracks.find((t) => t.id === trackId);

      if (track) {
        // Erstelle eine *tiefe* Kopie des Track-Objekts
        copiedTrack = JSON.parse(JSON.stringify(track)); // Klone das Objekt
        copiedTrack.id = currentTrackId++; // Wichtig: Neue ID, um Konflikte zu vermeiden!
      }
    }

    // --- Einfügen ---
    function pasteCopiedTrack() {
      if (!copiedTrack) return;

      saveStateForUndo(); // Vor der Änderung speichern!

      // Erstelle eine *tiefe* Kopie des kopierten Tracks (damit Änderungen am Original das nicht beeinflussen)
      const newTrack = JSON.parse(JSON.stringify(copiedTrack));

      // Aktualisiere ID und Element, um Konflikte zu vermeiden
      newTrack.id = currentTrackId++;
      newTrack.element = null; // Wird in addMediaToTimeline neu erstellt.
      newTrack.startTime = parseFloat(cursor.style.left) / (50 * zoomLevel); // Neue Startzeit (Cursorposition)

      // Erstelle einen neuen Blob und eine neue URL für die kopierte Spur
      getBlobFromUrl(copiedTrack.src).then(originalBlob => { //Blob laden
        if (!originalBlob) {
          console.error('Original Blob nicht gefunden');
          return;
        }

        const newBlob = new Blob([originalBlob], { type: originalBlob.type }); //neuer Blob
        const newUrl = URL.createObjectURL(newBlob); //neue URL
        newTrack.src = newUrl;

        if (newTrack.type === 'audio') { //neuen Audiobuffer erstellen
          getAudioBufferFromFile(newBlob).then(audioBuffer => {
            newTrack.audioBuffer = audioBuffer;
            addMediaToTimeline(newBlob, 'audio', audioBuffer, newTrack);
            tracks.push(newTrack); // Füge die *neue* Spur zum tracks-Array hinzu
          });
        } else { //Falls Video oder Bild
          addMediaToTimeline(newBlob, newTrack.type, null, newTrack);
          tracks.push(newTrack); // Füge die *neue* Spur zum tracks-Array hinzu
        }
      });
    }

    // --- Rückgängig/Wiederholen ---
    function saveStateForUndo() {
      // Zustand speichern
      const currentState = {
        tracks: JSON.parse(JSON.stringify(tracks)), // Tiefe Kopie der Spuren
        // Weitere relevante Zustandsdaten (z.B. zoomLevel, selectedTracks)
        zoomLevel: zoomLevel,
        selectedTracks: [...selectedTracks], // Kopie des Arrays

      };
      undoStack.push(currentState);
      if (undoStack.length > MAX_UNDO_STATES) {
        undoStack.shift(); // Älteste Zustände entfernen
      }
      redoStack = []; // Redo-Stack leeren
    }

    function undo() {
      if (undoStack.length === 0) return;

      const previousState = undoStack.pop(); // Letzten Zustand holen
      redoStack.push(getCurrentState()); // Aktuellen Zustand auf den Redo-Stack

      // Zustand wiederherstellen
      restoreState(previousState);
    }

    function redo() {
      if (redoStack.length === 0) return;

      const nextState = redoStack.pop(); // Nächsten Zustand holen
      undoStack.push(getCurrentState()); // Aktuellen Zustand auf den Undo-Stack

      // Zustand wiederherstellen
      restoreState(nextState);

    }
    //Helfer Funktion um aktuellen Zustand zu bekommen
    function getCurrentState() {
      return {
        tracks: JSON.parse(JSON.stringify(tracks)), // Tiefe Kopie der Spuren
        zoomLevel: zoomLevel,
        selectedTracks: [...selectedTracks],
      };
    }

    // Funktion, um den Zustand wiederherzustellen
    function restoreState(state) {
      // 1. Alles zurücksetzen
      clearTimeline();

      // 2. Zustand wiederherstellen
      zoomLevel = state.zoomLevel;
      selectedTracks = state.selectedTracks;

      // 3. Spuren wiederherstellen (asynchron, da Blobs geladen werden müssen)
      const loadPromises = state.tracks.map(trackData => {
        return getBlobFromUrl(trackData.src)
          .then(blob => {
            if (!blob) {
              console.error("Blob konnte nicht wiederhergestellt werden:", trackData.src);
              return; // Fehler, aber weiter mit den anderen Spuren
            }

            const file = new File([blob], "media-file", { type: blob.type }); // File-Objekt erstellen

            // Füge die Spur hinzu *ohne* erneutes Laden der Metadaten
            if (trackData.type === 'audio') {
              // Erstelle AudioBuffer *synchron* aus den gespeicherten Daten (falls vorhanden)
              let audioBuffer = null;
              if (trackData.audioBuffer) {
                audioBuffer = audioContext.createBuffer(
                  trackData.audioBuffer.numberOfChannels,
                  trackData.audioBuffer.length,
                  trackData.audioBuffer.sampleRate
                );
                for (let i = 0; i < trackData.audioBuffer.numberOfChannels; i++) {
                  audioBuffer.getChannelData(i).set(trackData.audioBuffer.channelData[i]);
                }
              }
              addMediaToTimeline(file, 'audio', audioBuffer, trackData);
            } else {
              addMediaToTimeline(file, trackData.type, null, trackData); // Kein AudioBuffer für Video/Bild
            }
          });
      });

      // Warten, bis *alle* Spuren geladen wurden
      Promise.all(loadPromises).then(() => {
        // UI aktualisieren (Zoom, Auswahl, etc.)
        updateZoom();
        updateTrackControls(); // Zeige die Einstellungen der ersten ausgewählten Spur an (falls vorhanden)
      });
    }

    //Alles zurrücksetzen
    function clearTimeline() {
      // Alle Spuren entfernen (DOM)
      audioTracksContainer.innerHTML = '';
      videoTracksContainer.innerHTML = '';
      imageTracksContainer.innerHTML = '';


      // Wavesurfer-Instanzen zerstören
      for (const trackId in wavesurferInstances) {
        if (wavesurferInstances.hasOwnProperty(trackId)) {
          wavesurferInstances[trackId].destroy();
        }
      }
      wavesurferInstances = {};

      // URLs freigeben (Speicherleck verhindern!)
      for (const track of tracks) {
        URL.revokeObjectURL(track.src);
      }

      // Tracks-Array leeren
      tracks = [];
      currentTrackId = 0; // Track-ID zurücksetzen
      selectedTracks = []; // Auswahl zurücksetzen
    }


    // --- Verschieben von Spuren (Drag-and-Drop-Handler) ---
    let draggedTrack = null; // Das aktuell gezogene Track-Objekt

    function handleDragStart(event) {
      const trackId = parseInt(event.target.dataset.trackId);
      draggedTrack = tracks.find(t => t.id === trackId);

      if (!draggedTrack) {
        event.preventDefault(); // Verhindere das Ziehen
        return;
      }
       event.dataTransfer.setData('text/plain', trackId); // ID für den Drop-Event
       event.target.classList.add('dragging');
    }

    function handleDragOver(event) {
      event.preventDefault();  //Erlaube das Droppen
    }

    function handleDrop(event) {
      event.preventDefault();
       if (!draggedTrack) return;

      const trackId = parseInt(event.dataTransfer.getData('text/plain'));
       if (isNaN(trackId)) return; // Stelle sicher, dass die ID eine Zahl ist.

      const dropTarget = event.target.closest('.timeline');
      if (!dropTarget) {
        draggedTrack.element.classList.remove('dragging'); // Entferne die Klasse
        draggedTrack = null;
        return; //Frühzeitiger Abbruch
      }

      // Berechne die neue Startzeit basierend auf der Mausposition (relativ zur Timeline)
      const timelineRect = timeline.getBoundingClientRect();
      let newStartTime = (event.clientX - timelineRect.left) / (50 * zoomLevel);

      // Einrasten am Raster (optional)
      if (snapToGrid) {
        newStartTime = Math.round(newStartTime / 0.5) * 0.5; //  0.5 Sekunden Raster
      }

       newStartTime = Math.max(0, newStartTime); //Keine Negativen Zeiten

      // Aktualisiere die Startzeit des Tracks
      draggedTrack.startTime = newStartTime;
      updateTrackDisplay(draggedTrack); // Neuzeichnen

        draggedTrack.element.classList.remove('dragging');
        draggedTrack = null; // Zurücksetzen
        saveStateForUndo(); // Zustand speichern
    }

    // --- Bereichauswahl (Drag-Selection) ---
    //Mousedown Event
    timeline.addEventListener('mousedown', (event) => {
      if (!selectionDiv) { //Div erstellen, wenn noch nicht vorhanden
        selectionDiv = document.createElement('div');
        selectionDiv.classList.add('selection-box');
        timeline.appendChild(selectionDiv); // Einmalig hinzufügen
      }
      isDragging = true; //Starte Dragging Modus
      dragStartX = event.clientX - timeline.getBoundingClientRect().left; // X-Position relativ zur Timeline

      //Setze Auswahl direkt an der richtigen Stelle

