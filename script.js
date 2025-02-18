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
      // Ignoriere Tastatureingaben in Input-Feldern (außer Checkboxen, um Snap-to-Grid zu toggeln)
      if (event.target.tagName.toLowerCase() === 'input' && event.target.type !== 'checkbox') {
        return;
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
          if (event.ctrlKey || event.metaKey) {
            copySelectedTrack();
          }
          break;
        case 'v': // Keine Modifikatortaste!
          if (event.ctrlKey || event.metaKey) {
            pasteCopiedTrack();
          }
          break;
        case 'z':
          if (event.ctrlKey || event.metaKey) {
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
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault(); // Verhindert das Standard-Speichern des Browsers
            saveProject();
          }
          break;
        case 'ArrowLeft':
          if (isPlaying) return;
          moveCursor(-0.1); //  0.1 Sekunden zurück
          break;
        case 'ArrowRight':
          if (isPlaying) return;
          moveCursor(0.1);  //  0.1 Sekunden vor
          break;
        case '+': // Zoom In (Plus-Taste)
        case '=': // Manche Tastaturen
           if (event.ctrlKey || event.metaKey) { // Mit Strg/Cmd-Taste
              zoomLevel *= 1.2;
              updateZoom();
              event.preventDefault(); // Standardverhalten verhindern (Browser-Zoom)
            }
            break;
        case '-': // Zoom Out (Minus-Taste)
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
        const currentPosition = parseFloat(cursor.style.left || 0); // Aktuelle Position in Pixeln, oder 0
        let newPosition = currentPosition + (delta * 50 * zoomLevel);     // Neue Position in Pixeln
        newPosition = Math.max(0,newPosition) // Nicht kleiner als Null

        cursor.style.left = `${newPosition}px`;  // CSS-Eigenschaft direkt setzen
      }

    // --- Mausrad (Zoom) ---
    //Debounce Funktion, damit nicht zu viele Events gefeuert werden.
    const debouncedUpdateZoom = debounce(updateZoom, 50); //kürzere Reaktionszeit

    function handleTimelineWheel(event) {
        event.preventDefault(); // Standardverhalten (Scrollen) verhindern

        // Zoom-Faktor basierend auf der Mausrad-Richtung
        const delta = event.deltaY > 0 ? 0.9 : 1.1; // Mausrad nach unten/oben, zoomt stärker
        zoomLevel *= delta;
       debouncedUpdateZoom(); // Aufruf über die debounced-Funktion
    }

    // --- Touch-Events (Mobile) ---
      let touchStartX = 0;
      let initialLeft = 0;

    function handleTouchStart(event) {
       if (event.touches.length === 1) { // Nur bei einem Finger
            touchStartX = event.touches[0].clientX;
            initialLeft = parseFloat(cursor.style.left || 0); // Aktuelle Cursorposition
             event.preventDefault(); // Standardverhalten verhindern
        }
    }

    function handleTouchMove(event) {
       if (event.touches.length === 1 && !isPlaying) { // Nur bei einem Finger
            const touchCurrentX = event.touches[0].clientX;
            const deltaX = touchCurrentX - touchStartX;
            let newPosition = initialLeft + deltaX;

            // Stelle sicher, dass der Cursor nicht negativ wird
            newPosition = Math.max(0, newPosition);
            cursor.style.left = `${newPosition}px`;  // CSS-Eigenschaft direkt
            event.preventDefault();
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
      } else if (event.data.type === 'mp3Blob') {
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

    // Event-Listener für Benutzerinteraktionen (um AudioContext fortzusetzen)
    document.addEventListener('click', resumeAudioContext);
    document.addEventListener('keydown', resumeAudioContext);
    document.addEventListener('touchstart', resumeAudioContext, { passive: true });


    // --- Funktionen für die Bearbeitung (Cut, Copy, Paste, Delete, Undo/Redo) ---
    //Cut
    async function cutSelectedTracks() {
      if (selectedTracks.length === 0) return;

      saveStateForUndo(); // Vor der Änderung speichern

      const cutPosition = parseFloat(cursor.style.left) / (50 * zoomLevel);  // Pixel in Sekunden

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
        tracks.splice(tracks.indexOf(track), 1, newTrack
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

    //Alles zurücksetzen
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
            event.preventDefault(); // Verhindere das Ziehen, wenn kein Track gefunden wurde
            return;
        }
         event.dataTransfer.setData('text/plain', trackId); // ID für den Drop-Event
         event.target.classList.add('dragging'); // Visuelles Feedback
    }

    function handleDragOver(event) {
     event.preventDefault();
    }

    function handleDrop(event) {
      event.preventDefault();
      if (!draggedTrack) return;

      const trackId = parseInt(event.dataTransfer.getData('text/plain'));
      if (isNaN(trackId)) return; // Stelle sicher, dass die ID eine Zahl ist.

      const dropTarget = event.target.closest('.timeline');
      if (!dropTarget) {
          draggedTrack.element.classList.remove('dragging');
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
         saveStateForUndo();
    }


    // --- Zoomen ---
    //Debounce Funktion, damit nicht zu viele Events gefeuert werden.
    const debouncedUpdateZoom = debounce(updateZoom, 50); //kürzere Reaktionszeit
    function updateZoom() {
        // Begrenze den Zoom-Level (optional, aber sinnvoll)
        zoomLevel = Math.max(0.5, Math.min(5, zoomLevel)); //  Werte anpassen

        // Aktualisiere die Breite *aller* Spuren
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

        // Umrechnung von Pixeln in Sekunden (unter Berücksichtigung des Zoom-Levels)
        const clickTime = clickX / (50 * zoomLevel);

        // Setze die Abspielposition im AudioContext
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(()=> {
              audioContext.currentTime = clickTime;
            }); //Context Zustand prüfen und ggf. fortsetzen
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

    // --- Audio-Analyse (Tonart, BPM, Kammerton) ---

    function detectKey(audioBuffer) {
        // Sende den AudioBuffer an den Web Worker
        audioWorker.postMessage({ type: 'detectKey', data: { audioBuffer } });
    }

    function detectBPM(audioBuffer) {
        audioWorker.postMessage({ type: 'detectBPM', data: { audioBuffer } });
    }

    function detectConcertPitch() {
      analyser.getByteFrequencyData(dataArray); // Daten in das Array kopieren

      let maxIndex = 0;
      let maxValue = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (dataArray[i] > maxValue) {
          maxValue = dataArray[i];
          maxIndex = i;
        }
      }

      const frequency = maxIndex * audioContext.sampleRate / analyser.fftSize;
      alert(`Geschätzter Kammerton: ${frequency.toFixed(1)} Hz`); // Ausgabe
      concertPitchInput.value = frequency.toFixed(1); //Eingabefeld
    }

    function updateConcertPitch() {
      const newPitch = parseFloat(concertPitchInput.value);
      if (!isNaN(newPitch) && newPitch >= 400 && newPitch <= 480) {
        concertPitch = newPitch;
        localStorage.setItem('concertPitch', concertPitch); // Speichern
      } else {
        alert("Ungültiger Kammerton. Bitte einen Wert zwischen 400 und 480 Hz eingeben.");
        concertPitchInput.value = concertPitch; // Zurücksetzen
      }
    }

      // --- Visualisierung ---

    function renderVisuals() {
        if (!visualsContext) return; // Keine Canvas vorhanden

        const mode = visualsModeSelect.value; // Aktuellen Modus abrufen

        // Canvas löschen
        visualsContext.clearRect(0, 0, visualsCanvas.width, visualsCanvas.height);

         if (mode === 'off') return; // Visualisierung deaktiviert

        // Analysedaten vom AnalyserNode holen
         analyser.getByteFrequencyData(dataArray); // Daten in das dataArray kopieren (Frequenzdaten)
        //analyser.getByteTimeDomainData(dataArray); // Daten für Wellenform (Alternative)

        const barWidth = (visualsCanvas.width / bufferLength) * 2.5; // Breite der Balken
        let barHeight;
        let x = 0; // Horizontale Position

         if (mode === 'bars') {
            // --- Balkenanzeige ---
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] * (visualsCanvas.height / 255); // Skalierung (0-255)

                // Farbverlauf (optional)
                const r = barHeight + (25 * (i / bufferLength));
                const g = 250 * (i / bufferLength);
                const b = 50;

                visualsContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
                visualsContext.fillRect(x, visualsCanvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1; // Abstand zwischen den Balken
            }
        } else if (mode === 'spectrum') {
            // --- Spektralanzeige (Kreis oder Linie) ---
            // (Implementierung hier)
             // ... (komplexere Logik, siehe Hinweise unten) ...
              // Beispiel: Einfache Linienzeichnung (sehr vereinfacht)
            visualsContext.beginPath();
            visualsContext.moveTo(0, visualsCanvas.height); //  linken unteren Ecke
            for (let i = 0; i < bufferLength; i++) {
              barHeight = dataArray[i] * (visualsCanvas.height / 255);
              let y = visualsCanvas.height - barHeight; // Invertieren
              visualsContext.lineTo(i * (visualsCanvas.width / bufferLength), y);
           }
             visualsContext.lineTo(visualsCanvas.width, visualsCanvas.height); //  rechten unteren Ecke
            visualsContext.strokeStyle = 'rgb(0, 165, 25
            visualsContext.stroke(); // Zeichne die Linie

        } else if (mode === 'waveform') {
            // --- Wellenform ---
           analyser.getByteTimeDomainData(dataArray); //Zeitbereichsdaten!
            visualsContext.beginPath();
            const sliceWidth = visualsCanvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0; // Normalisieren (0-255 -> 0-2)
                const y = v * visualsCanvas.height / 2;

                if (i === 0) {
                    visualsContext.moveTo(x, y);
                } else {
                    visualsContext.lineTo(x, y);
                }
                x += sliceWidth;
            }
             visualsContext.lineTo(visualsCanvas.width, visualsCanvas.height / 2); //Zur Mitte
            visualsContext.strokeStyle = 'rgb(0, 165, 255)'; // Farbe
            visualsContext.stroke();
        }
    }

    // Event-Listener für den Visualisierungsmodus
    if(visualsModeSelect){ //Stelle sicher, dass das Element existiert.
      visualsModeSelect.addEventListener('change', () => {
        if (visualsModeSelect.value !== 'off') {
            // Starte die Visualisierung, falls sie nicht schon läuft
            if (!isPlaying) {
              togglePlayPause(); // Starte die Wiedergabe (und damit die Visualisierung)
              // Keine zusätzliche Logik hier, da updateCursor die Visualisierung aktualisiert
            }
        }
      });
    }



    // --- Export-Funktionen ---

    // Haupt-Exportfunktion
    async function exportProject() {
        const exportFormat = exportFormatSelect.value;
        const videoFormat = exportVideoButtonFormat.value;

        // Setze Endzeit, falls nicht gesetzt
        if (exportEndTime === 0) {
            let maxDuration = 0;
            for (const track of tracks) {
                maxDuration = Math.max(maxDuration, track.startTime + track.duration);
            }
            exportEndTime = maxDuration;
        }

        exportProgress.style.display = "block";
        exportProgress.querySelector("progress").value = 0;
        exportProgressSpan.textContent = "Exportiere...";
        exportMessageDiv.textContent = '';

        try {
            if (exportFormat === 'mp4') {
                // VIDEO-EXPORT mit ffmpeg.wasm
                if (!ffmpeg || !ffmpeg.isLoaded()) { // Prüfe, ob ffmpeg geladen ist
                    alert("FFmpeg wird noch geladen oder ist nicht verfügbar. Bitte versuche es in Kürze erneut, oder verwende ein anderes Exportformat.");
                    exportProgress.style.display = "none"; // Fortschrittsanzeige ausblenden
                    return;
                }
                await exportVideoWithFFmpeg(exportStartTime, exportEndTime, videoFormat);


            } else if (exportFormat === 'webm') { // WebM direkt
                const videoBlob = await captureVideoFramesAsWebM(exportStartTime, exportEndTime);
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(videoBlob);
                downloadLink.download = 'export.webm';
                downloadLink.click();
                URL.revokeObjectURL(downloadLink.href);

            } else if (exportFormat === 'mp3' || exportFormat === 'wav') {
                // AUDIO-EXPORT
                const audioBlob = await exportAudio(exportFormat, exportStartTime, exportEndTime);
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(audioBlob);
                downloadLink.download = `export.${exportFormat}`;
                downloadLink.click();
                URL.revokeObjectURL(downloadLink.href);

            } else if (exportFormat === 'jpeg' || exportFormat === 'png') {
                // BILD-EXPORT
                const imageBlob = exportImage(exportFormat);

                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(imageBlob);
                downloadLink.download = 'export.' + exportFormat;
                downloadLink.click();
                URL.revokeObjectURL(downloadLink.href);
            }
            exportProgress.querySelector("progress").value = 100;
            exportProgressSpan.textContent = "Export abgeschlossen!";
            setTimeout(() => { exportProgress.style.display = "none"; }, 2000);

        } catch (error) {
            console.error("Fehler beim Export:", error);
            alert("Fehler beim Export: " + error.message);
            exportMessageDiv.textContent = "Export fehlgeschlagen: " + error.message; // Detailliertere Meldung
            exportProgress.style.display = "none";
        }
    }
    // --- Export Audio ---

    async function exportAudio(format, startTime = 0, endTime = null) {
        if(tracks.length === 0){
          throw new Error('Keine Spuren zum exportieren vorhanden')
        }

        // 1. Bestimme die Länge des resultierenden Audiobuffers
        let maxLength = 0;
        for (const track of tracks) {
          if(track.type === 'audio'){ //Nur Audiospuren
            const trackEndTime = track.startTime + track.duration;
            maxLength = Math.max(maxLength, trackEndTime);
          }
        }
          // Berücksichtige Export-Zeitbereich
        const actualEndTime = endTime !== null ? Math.min(endTime, maxLength) : maxLength;
        const duration = Math.max(0, actualEndTime - startTime); //Stelle sicher, dass die Dauer nicht negativ ist


        // 2. Erstelle einen OfflineAudioContext
        const offlineContext = new OfflineAudioContext(
            2, // Anzahl der Kanäle (Stereo)
            Math.floor(duration * audioContext.sampleRate), // Länge in Samples
            audioContext.sampleRate
        );

        // 3. Verbinde alle Audiospuren mit dem OfflineAudioContext
        for (const track of tracks) {
            if (track.type === 'audio' && track.audioBuffer) {
                // Erstelle einen BufferSourceNode für den Track
                const source = offlineContext.createBufferSource();
                source.buffer = track.audioBuffer;

                // Wende Effekte an (tiefe Kopie, um Original nicht zu verändern)
                const gainNode = offlineContext.createGain();
                const pannerNode = offlineContext.createStereoPanner();
                const filterNode = offlineContext.createBiquadFilter(); //Hinzugefügt

                //Verbindungen
                source.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(filterNode);
                filterNode.connect(offlineContext.destination);

                // Werte setzen (aus track.effectValues)
                gainNode.gain.value = track.effectValues.volume;
                pannerNode.pan.value = track.effectValues.panning;
                filterNode.type = track.effectValues.filterType;
                filterNode.frequency.value = track.effectValues.filterCutoff;

                // Berechne die Startzeit im Kontext des Exports
                let trackStartTime = track.startTime - startTime;
                trackStartTime = Math.max(0, trackStartTime); // Stelle sicher, dass die Startzeit nicht negativ ist

                // Starte die Wiedergabe der Spur zum richtigen Zeitpunkt
                source.start(trackStartTime);
            }
        }

        // 4. Rendere den OfflineAudioContext (asynchron)
          return new Promise((resolve, reject) => {
            offlineContext.startRendering().then(async (renderedBuffer) => { // Rendern starten

                // 5. Konvertiere den gerenderten AudioBuffer in das gewünschte Format (WAV oder MP3)
                let audioBlob;
                if (format === 'wav') {
                    audioBlob = await audioBufferToBlob(renderedBuffer, 'audio/wav');
                } else if (format === 'mp3') {
                    // MP3-Encoding im Web Worker (LAMEjs)
                    audioWorker.postMessage({ type: 'encodeAudio', data: { audioBuffer: renderedBuffer, bitRate: 192 } }); //192kbps

                    audioBlob = await new Promise((resolveWorker, rejectWorker) => {
                      audioWorker.onmessage = (event) => { //Abfangen der Worker Message
                        if (event.data.type === 'mp3Blob') {
                          resolveWorker(event.data.mp3Blob); // Bei Erfolg -> Promise auflösen
                        } else if (event.data.type === 'error') {
                          rejectWorker(new Error(event.data.message)); // Bei Fehler -> Promise ablehnen
                        }
                      };
                       audioWorker.onerror = (error) => { // Fehler im Worker abfangen
                            console.error("Worker error:", error);
                            rejectWorker(error); // Fehler weiterleiten
                        };
                    });

                } else {
                    reject(new Error('Ungültiges Audioformat')); // Fehler, falls ungültiges Format
                    return;
                }
                resolve(audioBlob); // Gebe den Blob zurück
            }).catch(reject); // Fehler beim Rendern abfangen
        });
    }

    // --- Export Video (WebM) ---
    async function captureVideoFramesAsWebM(startTime = 0, endTime = null) {
        return new Promise((resolve, reject) => {
          // 1. Bestimme die Dimensionen und Framerate für den Export
            const resolution = exportResolutionSelect.value.split('x');
            const width = parseInt(resolution[0]);
            const height = parseInt(resolution[1]);
            const framerate = parseInt(exportFramerateSelect.value);

            // 2. Erstelle ein Canvas-Element in der gewünschten Größe
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');

            // 3. Erstelle einen MediaStream aus dem Canvas
            const stream = canvas.captureStream(framerate);

            // 4. Erstelle einen MediaRecorder
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
            let chunks = []; //Speichert die Daten

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'video/webm' });
              resolve(blob); //Promise mit dem Blob als Ergebnis auflösen
            };

            recorder.onerror = (error) => {
                console.error("Fehler beim Encodieren des Videos:", error);
                reject(error); // Promise ablehnen, wenn Fehler auftritt
            };
            recorder.start();
            // 5. Zeichne die Frames auf das Canvas (asynchron)
            let currentTime = startTime;
            const frameDuration = 1 / framerate;

           function drawFrame() {
              // Berechne die aktuelle Zeit relativ zum Startzeitpunkt des Exports.
              let currentTime = startTime;
              // Zeichne die Frames auf das Canvas (asynchron, mit requestAnimationFrame)
              function drawFrame() {
                // Berechne die aktuelle Zeit relativ zum Startzeitpunkt des Exports.
                let currentTime = startTime; //Sicherstellen das alles bei 0 anfängt
                //Zeichne aktuellen Frame
                drawVideoFrame(context, width, height, currentTime);

                currentTime += frameDuration; //Erhöhe Zeit

                if (endTime !== null && currentTime < endTime) { //Prüfe, ob die Endzeit erreicht wurde
                  // Fordere den nächsten Frame an, solange das Ende nicht erreicht ist
                    requestAnimationFrame(drawFrame); // Nächsten Frame anfordern
                } else {
                  // Stoppe die Aufnahme, wenn das Ende erreicht ist
                    recorder.stop();
                }
             }
               drawFrame(); //Ersten Frame zeichnen
           }
           drawFrame(); // Starte die Zeichenschleife
        });
    }

    function drawVideoFrame(context, width, height, currentTime) {
        // Lösche den Canvas-Inhalt
        context.clearRect(0, 0, width, height);

        // Zeichne alle sichtbaren Video- und Bildspuren
        for (const track of tracks) {
            if (track.type === 'video' || track.type === 'image') {
               const trackStart = track.startTime;
               const trackEnd = track.startTime + track.duration;
                // Überprüfen, ob der aktuelle Zeitpunkt innerhalb der Spur liegt.
              if(currentTime >= trackStart && currentTime <= trackEnd){
                const media = track.mediaElement;

                // Berechne die Position und Größe für das Zeichnen (unter Berücksichtigung von Seitenverhältnis und 'object-fit')
                let drawWidth = media.videoWidth || media.width;
                let drawHeight = media.videoHeight || media.height;
                let x = 0;
                let y = 0;

                // Passe die Größe an, um das Seitenverhältnis beizubehalten,
                // ähnlich wie object-fit: contain
                const videoRatio = drawWidth / drawHeight;
                const canvasRatio = width / height;

                if (videoRatio > canvasRatio) {
                    // Video ist breiter als der Canvas
                    drawHeight = height;
                    drawWidth = height * videoRatio;
                    x = (width - drawWidth) / 2; // Zentrieren
                } else {
                    // Video ist höher oder gleich breit wie der Canvas
                    drawWidth = width;
                    drawHeight = width / videoRatio;
                    y = (height - drawHeight) / 2; // Zentrieren
                }

                // Wende CSS-Filter an (Helligkeit, Kontrast, etc.)
                context.filter = track.mediaElement.style.filter;
                // Zeichne das Video-/Bildelement auf den Canvas.
                context.drawImage(media, x, y, drawWidth, drawHeight);

                // Setze den Filter zurück, um andere Elemente nicht zu beeinflussen
                context.filter = 'none';
              }
            }
        }
    }
    // ---
    // --- Export Image ---
    function exportImage(format) {
        const canvas = document.createElement('canvas'); // Canvas erstellen
        canvas.width = 1920;  //  Standardauflösung, anpassen
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        // Zeichne die *sichtbaren* Video- und Bildspuren auf das Canvas (ähnlich wie beim Video-Export)
        for (const track of tracks) {
            if ((track.type === 'video' || track.type === 'image') && track.mediaElement) {
                // Einfache Zeichenoperation (ohne Zeitlogik, da es ein Standbild ist)
                ctx.drawImage(track.mediaElement, 0, 0, canvas.width, canvas.height); //Anpassen für Seitenverhältnis
            }
        }

        // Canvas-Inhalt als Blob exportieren (JPEG oder PNG)
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        let quality = 0.9; //Standardqualität
        if(format === 'jpeg'){
          return canvas.toBlob((blob) => {
            resolve(blob);
          }, mimeType, quality);
        } else {
          return canvas.toBlob((blob) => {
            resolve(blob);
          }, mimeType);
        }
    }

    // --- Laden und Speichern ---
       //Speichern
    function saveProject() {
        const projectData = {
            tracks: tracks.map(track => ({
                type: track.type,
                src: track.src, // URL des Blobs
                startTime: track.startTime,
                duration: track.duration,
                effectValues: track.effectValues, // Speichere *alle* Effekte!
                audioBuffer: track.type === 'audio' ? { // Speichere AudioBuffer-Daten *separat*
                    numberOfChannels: track.audioBuffer.numberOfChannels,
                    length: track.audioBuffer.length,
                    sampleRate: track.audioBuffer.sampleRate,
                    channelData: Array.from({ length: track.audioBuffer.numberOfChannels }, (_, i) => Array.from(track.audioBuffer.getChannelData(i))),
                } : null,
            })),
            concertPitch: concertPitch,
            zoomLevel: zoomLevel,
            snapToGrid: snapToGrid,
            // ... (weitere globale Einstellungen) ...
        };

        const projectJson = JSON.stringify(projectData);

        // Download anbieten
        const blob = new Blob([projectJson], { type: 'application/json' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'echoel-project.esproj'; // .esproj als Dateiendung
        downloadLink.click();
        URL.revokeObjectURL(downloadLink.href); // URL wieder freigeben
    }

   async function loadProject(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
          if (file.name.split('.').pop() !== 'esproj') { //Dateiendung prüfen
            alert('Ungültiges Dateiformat. Bitte eine .esproj Datei auswählen.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);

                // 1. Alles zurücksetzen (wichtig!)
                clearTimeline();
                resetGlobalSettings();

                // 2. Globale Einstellungen wiederherstellen
                concertPitch = projectData.concertPitch || 440;
                concertPitchInput.value = concertPitch;
                zoomLevel = projectData.zoomLevel || 1;
                snapToGridCheckbox.checked = projectData.snapToGrid || false;

                // 3. Spuren wiederherstellen (asynchron, da Blobs geladen werden müssen)
                const loadPromises = projectData.tracks.map(trackData => {
                    return getBlobFromUrl(trackData.src) // Blob laden
                        .then(blob => {
                            if (!blob) {
                                console.error("Blob konnte nicht wiederhergestellt werden:", trackData.src);
                                // Fehlerbehandlung: Benutzer informieren, Datei neu auswählen lassen, etc.
                                return; // Fehler, aber weiter mit den anderen Spuren
                            }
                             const file = new File([blob], "media-file", { type: blob.type });
                            // Füge die Spur hinzu *ohne* erneutes Laden der Metadaten (die sind ja schon in trackData)
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
                                addMediaToTimeline(file, trackData.type, null, trackData); // Kein AudioBuffer
                            }
                        });
                });

                // Warten, bis *alle* Spuren geladen wurden
                Promise.all(loadPromises).then(() => {
                    updateZoom(); // Zoom anpassen
                    updateTrackControls();
                    editorSection.style.display = 'block'; // Editor-Sektion anzeigen
                    exportSection.style.display = 'block';
                });
              //Fehler fangen
            } catch (error) {
                console.error("Fehler beim Laden des Projekts:", error);
                alert("Fehler beim Laden des Projekts. Die Datei ist möglicherweise beschädigt oder hat ein ungültiges Format.");
            }
        };
        reader.readAsText(file); // JSON-Datei als Text lesen
    }

    // Hilfsfunktion: Timeline leeren, bevor ein neues Projekt geladen wird
    function clearTimeline() {
      //DOM-Elemente entfernen
      audioTracksContainer.innerHTML = '';
      videoTracksContainer.innerHTML = '';
      imageTracksContainer.innerHTML = '';

      // Wavesurfer-Instanzen zerstören
      for(const trackId in wavesurferInstances){
        if(wavesurferInstances.hasOwnProperty(trackId)){
          wavesurferInstances[trackId].destroy();
        }
      }
      wavesurferInstances = {};

       // URLs freigeben (Speicherleck verhindern!)
        for (const track of tracks) {
            URL.revokeObjectURL(track.src);
        }

      tracks = []; //Leere Tracks
      currentTrackId = 0; // ID zurücksetzen
      selectedTracks = []; //Auswahl leeren
    }

    // Hilfsfunktion: Globale Einstellungen zurücksetzen
    function resetGlobalSettings() {
      concertPitch = 440;
      concertPitchInput.value = concertPitch;
      zoomLevel = 1;
      snapToGridCheckbox.checked = false;
      // ... (weitere Einstellungen) ...
    }

      // --- Teilen von Projekten ---
    function shareProject() {
       // Speichere das Projekt
        const projectData = {
            tracks: tracks.map(track => ({
                type: track.type,
                src: track.src,
                startTime: track.startTime,
                duration: track.duration,
                effectValues: track.effectValues,
                audioBuffer: track.type === 'audio' ? { // Speichere AudioBuffer-Daten *separat*
                    numberOfChannels: track.audioBuffer.numberOfChannels,
                    length: track.audioBuffer.length,
                    sampleRate: track.audioBuffer.sampleRate,
                    channelData: Array.from({ length: track.audioBuffer.numberOfChannels }, (_, i) => Array.from(track.audioBuffer.getChannelData(i))),
                } : null, // Keine Audiodaten für Video/Bild
                 muted: track.muted, //hinzugefügt
                solo: track.solo, //hinzugefügt
            })),
            concertPitch: concertPitch,
            zoomLevel: zoomLevel,
            snapToGrid: snapToGrid,

        };

        const projectJson = JSON.stringify(projectData);

        // Erstelle einen Blob aus den JSON-Daten.
        const blob = new Blob([projectJson], { type: 'application/json' });

        // Erstelle eine temporäre URL für den Blob.
        const url = URL.createObjectURL(blob);

        // Erstelle einen Link, der die URL als Parameter enthält.
        const shareLink = window.location.origin + window.location.pathname + '?project=' + encodeURIComponent(url);

        // Kopiere den Link in die Zwischenablage.
        navigator.clipboard.writeText(shareLink).then(() => {
            alert('Projekt-Link in die Zwischenablage kopiert. Teile diesen Link, um das Projekt zu laden.');
        }).catch(err => {
            console.error('Fehler beim Kopieren in die Zwischenablage:', err);
             alert('Fehler beim Kopieren des Links. Bitte manuell kopieren.');
        });

       // URL.revokeObjectURL(url); // WICHTIG: URL wieder freigeben, nachdem der Link kopiert wurde!
    }

    // --- Laden von Projekten über URL-Parameter ---
      function loadProjectFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectUrl = urlParams.get('project');

        if (projectUrl) {
          // Wenn ein Projektparameter vorhanden ist.
            fetch(projectUrl) // URL abrufen (Cross-Origin beachten!)
                .then(response => {
                  if (!response.ok) {
                   throw new Error(`HTTP-Fehlerstatus: ${response.status}`); // Fehler bei nicht erfolgreicher Antwort
                  }
                  return response.json();
                })
                .then(projectData => {
                  //Verarbeite die Projektdaten, stelle Spuren wieder her usw.
                    clearTimeline();
                    resetGlobalSettings();

                    concertPitch = projectData.concertPitch || 440;
                    concertPitchInput.value = concertPitch;
                    zoomLevel = projectData.zoomLevel || 1;
                    snapToGridCheckbox.checked = projectData.snapToGrid || false;

                    const loadPromises = projectData.tracks.map(trackData => {
                        return getBlobFromUrl(trackData.src)
                            .then(blob => {
                                if (!blob) {
                                    console.error("Blob konnte nicht wiederhergestellt werden:", trackData.src);
                                     return;
                                }
                                const file = new File([blob], "media-file", { type: blob.type });
                                if (trackData.type === 'audio') {
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
                                    addMediaToTimeline(file, trackData.type, null, trackData); // Kein AudioBuffer
                                }
                            });
                    });

                    Promise.all(loadPromises).then(() => {
                        updateZoom();
                        updateTrackControls();
                        editorSection.style.display = 'block';
                        exportSection.style.display = 'block';
                    });
                })
                .catch(error => {
                    console.error("Fehler beim Laden des Projekts von URL:", error);
                    alert("Fehler beim Laden des Projekts von der URL.");
                });
        }
    }

    // --- Initialisierung der Export-Optionen ---
    function initializeExportOptions() {
        // Auflösungen (Beispiele - anpassen!)
        const resolutions = [
            { width: 1280, height: 720, label: "720p (HD)" },
            { width: 1920, height: 1080, label: "1080p (Full HD)" },
            { width: 3840, height: 2160, label: "4K (Ultra HD)" },
             { width: 640, height: 480, label: "640x480 (SD)" }, // Standard Definition
            { width: 854, height: 480, label: "480p (SD)" },   // 16:9 SD
        ];

        // Framerates (Beispiele)
        const framerates = [24, 30, 60, 29.97, 59.94];

        // Audio-Bitrates (Beispiele)
        const bitrates = [
            { value: 128000, label: "128 kbps" },
            { value: 192000, label: "192 kbps" },
            { value: 320000, label: "320 kbps" },
        ];

        // Optionen zu den Select-Elementen hinzufügen
        for (const res of resolutions) {
            const option = document.createElement('option');
            option.value = `${res.width}x${res.height}`;
            option.textContent = `${res.label} (${res.width}x${res.height})`;
            exportResolutionSelect.appendChild(option);
        }

        for (const fps of framerates) {
            const option = document.createElement('option');
            option.value = fps;
            option.textContent = `${fps} fps`;
            exportFramerateSelect.appendChild(option);
        }
        for (const rate of bitrates) {
            const option = document.createElement('option');
            option.value = rate.value;
            option.textContent = `${rate.label}`;
            exportAudioBitrateSelect.appendChild(option)
        }
    }
});
    // --- Timeline-Interaktion (Klicken) ---

    timeline.addEventListener('click', handleTimelineClick);

    function handleTimelineClick(event) {
        // Berechne die Klickposition relativ zur Timeline
        const timelineRect = timeline.getBoundingClientRect();
        const clickX = event.clientX - timelineRect.left;

        // Umrechnung von Pixeln in Sekunden (unter Berücksichtigung des Zoom-Levels)
        const clickTime = clickX / (50 * zoomLevel);

        // Setze die Abspielposition im AudioContext
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => { // Context fortsetzen, falls angehalten
                audioContext.currentTime = clickTime;
            });
        } else {
            audioContext.currentTime = clickTime; // Zeit setzen
        }

        // Bewege den Cursor an die neue Position (visuell)
        cursor.style.left = `${clickX}px`;

        // Starte die Wiedergabe, falls nicht schon aktiv
        if (!isPlaying) {
            togglePlayPause();
        }
    }


    // --- Drag & Drop (Verschieben von Spuren) ---

    let draggedTrack = null; // Das aktuell gezogene Track-Objekt

    function handleDragStart(event) {
        const trackId = parseInt(event.target.dataset.trackId);
        draggedTrack = tracks.find(t => t.id === trackId);

        if (!draggedTrack) {
            event.preventDefault(); // Verhindere das Ziehen, wenn kein Track gefunden
            return;
        }

        event.dataTransfer.setData('text/plain', trackId); // ID für den Drop-Event
        event.target.classList.add('dragging'); // Visuelles Feedback (CSS-Klasse)
    }


    function handleDragOver(event) {
        event.preventDefault();  // Erlaube das Droppen (Standardverhalten verhindern)
    }

    function handleDrop(event) {
      event.preventDefault();
      if (!draggedTrack) return;

      const trackId = parseInt(event.dataTransfer.getData('text/plain'));
      if (isNaN(trackId)) return; // Stelle sicher, dass die ID eine Zahl ist.

      const dropTarget = event.target.closest('.timeline');
      if (!dropTarget) {
        draggedTrack.element.classList.remove('dragging');
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


    // --- Audio-Analyse (Tonart, BPM, Kammerton) ---
    //Aufruf über Web Worker
    function detectKey(audioBuffer) {
        audioWorker.postMessage({ type: 'detectKey', data: { audioBuffer } });
    }

    function detectBPM(audioBuffer) {
        audioWorker.postMessage({ type: 'detectBPM', data: { audioBuffer } });
    }

    function detectConcertPitch() {
        analyser.getByteFrequencyData(dataArray); // Daten in das Array kopieren

        let maxIndex = 0;
        let maxValue = 0;
        for (let i = 0; i < bufferLength; i++) {
            if (dataArray[i] > maxValue) {
                maxValue = dataArray[i];
                maxIndex = i;
            }
        }

        const frequency = maxIndex * audioContext.sampleRate / analyser.fftSize;
        alert(`Geschätzter Kammerton: ${frequency.toFixed(1)} Hz`); // Ausgabe
        concertPitchInput.value = frequency.toFixed(1); //Eingabefeld
    }

    function updateConcertPitch() {
      const newPitch = parseFloat(concertPitchInput.value);
      if (!isNaN(newPitch) && newPitch >= 400 && newPitch <= 480) {
        concertPitch = newPitch;
        localStorage.setItem('concertPitch', concertPitch); // Speichern
      } else {
        alert("Ungültiger Kammerton. Bitte einen Wert zwischen 400 und 480 Hz eingeben.");
        concertPitchInput.value = concertPitch; // Zurücksetzen
      }
    }

    // --- Visualisierung ---
    function renderVisuals() {
        if (!visualsContext) return; // Keine Canvas vorhanden, Abbruch

        const mode = visualsModeSelect.value;

        visualsContext.clearRect(0, 0, visualsCanvas.width, visualsCanvas.height); // Löschen

        if (mode === 'off') return; // Visualisierung deaktiviert

        if (mode === 'bars' || mode === 'spectrum') {
            analyser.getByteFrequencyData(dataArray); // Frequenzdaten
        } else if (mode === 'waveform') {
            analyser.getByteTimeDomainData(dataArray); // Zeitdaten (Wellenform)
        }

        const barWidth = (visualsCanvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        if (mode === 'bars') {
            // Balkenanzeige
            for (let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] * (visualsCanvas.height / 255); // Skalierung (0-255)
                const r = barHeight + (25 * (i / bufferLength)); // Rot-Anteil
                const g = 250 * (i / bufferLength);                // Grün-Anteil
                const b = 50;                                     // Blau-Anteil
                visualsContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
                visualsContext.fillRect(x, visualsCanvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        } else if (mode === 'spectrum') {
          // Spektralanzeige
            visualsContext.beginPath();
            visualsContext.moveTo(0, visualsCanvas.height);
            for (let i = 0; i < bufferLength; i++) {
              barHeight = dataArray[i] * (visualsCanvas.height / 255);
              let y = visualsCanvas.height - barHeight; // Invertieren
              visualsContext.lineTo(i * (visualsCanvas.width / bufferLength), y);
           }
             visualsContext.lineTo(visualsCanvas.width, visualsCanvas.height); //  rechten unteren Ecke
            visualsContext.strokeStyle = 'rgb(0, 165, 255)'; // Farbe
            visualsContext.stroke();
        } else if (mode === 'waveform') {
            // Wellenform
             visualsContext.beginPath();
            const sliceWidth = visualsCanvas.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0; // Normalisieren (0-255 -> 0-2)
                const y = v * visualsCanvas.height / 2;

                if (i === 0) {
                    visualsContext.moveTo(x, y);
                } else {
                    visualsContext.lineTo(x, y);
                }
                x += sliceWidth;
            }
             visualsContext.lineTo(visualsCanvas.width, visualsCanvas.height / 2); //Zur Mitte
            visualsContext.strokeStyle = 'rgb(0, 165, 255)'; // Farbe
            visualsContext.stroke();
        }
    }

    // Event-Listener für den Visualisierungsmodus
    if (visualsModeSelect) {
      visualsModeSelect.addEventListener('change', () => {
        if (visualsModeSelect.value !== 'off') {
          // Starte Visualisierung, falls noch nicht geschehen
          if (!isPlaying) {
            togglePlayPause(); // Starte die Wiedergabe
          }
        }
      });
    }

    // --- Export-Funktionen ---
    async function exportProject() {
        const exportFormat = exportFormatSelect.value;
        const videoFormat = exportVideoButtonFormat.value; // Wert aus Auswahlfeld

        // Setze Endzeit, falls nicht gesetzt (auf maximale Länge)
        if (exportEndTime === 0) {
            let maxDuration = 0;
            for (const track of tracks) {
                maxDuration = Math.max(maxDuration, track.startTime + track.duration);
            }
            exportEndTime = maxDuration;
        }

        exportProgress.style.display = "block";
        exportProgress.querySelector("progress").value = 0;
        exportProgressSpan.textContent = "Exportiere...";
        exportMessageDiv.textContent = ''; // Meldungen zurücksetzen

        try {
            if (exportFormat === 'mp4') {
                // VIDEO-EXPORT mit ffmpeg.wasm
                if (!ffmpeg || !ffmpeg.isLoaded()) { // Prüfe ob FFmpeg bereit ist
                    alert("FFmpeg wird noch geladen oder ist nicht verfügbar. Bitte versuche es in Kürze erneut, oder verwende ein anderes Exportformat (WebM).");
                    exportProgress.style.display = "none"; // Fortschrittsanzeige ausblenden
                    return; // Abbruch
                }
                await exportVideoWithFFmpeg(exportStartTime, exportEndTime, videoFormat); // Aufruf


            } else if (exportFormat === 'webm') {
              // VIDEO-EXPORT (WebM direkt)
                const videoBlob = await captureVideoFramesAsWebM(exportStartTime, exportEndTime); // Funktion von vorher
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(videoBlob);
                downloadLink.download = 'export.webm'; // Dateiname
                downloadLink.click(); // Download auslösen
                 URL.revokeObjectURL(downloadLink.href); // URL freigeben

            } else if (exportFormat === 'mp3' || exportFormat === 'wav') {
                // AUDIO-EXPORT
                const audioBlob = await exportAudio(exportFormat, exportStartTime, exportEndTime);
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(audioBlob);
                downloadLink.download = `export.${exportFormat}`; // Dateiendung (.mp3 oder .wav)
                downloadLink.click();
                URL.revokeObjectURL(downloadLink.href);

            } else if (exportFormat === 'jpeg' || exportFormat === 'png') {
                // BILD-EXPORT (vereinfacht, nimmt aktuellen Frame)
                const imageBlob = exportImage(exportFormat);

                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(imageBlob);
                downloadLink.download = 'export.' + exportFormat; // Dateiendung
                downloadLink.click();
                URL.revokeObjectURL(downloadLink.href);

            }

            exportProgress.querySelector("progress").value = 100; // Fortschritt auf 100%
            exportProgressSpan.textContent = "Export abgeschlossen!";
            setTimeout(() => { exportProgress.style.display = "none"; }, 2000); // Ausblenden

        } catch (error) {
            console.error("Fehler beim Export:", error);
            alert("Fehler beim Export: " + error.message);
            exportMessageDiv.textContent = "Export fehlgeschlagen: " + error.message; // Detailliertere Meldung
            exportProgress.style.display = "none";
        }
    }
    //rendern der Videoframes für WebM
    async function captureVideoFramesAsWebM(startTime = 0, endTime = null) {
        return new Promise((resolve, reject) => {
          // 1. Bestimme die Dimensionen und Framerate für den Export
            const resolution = exportResolutionSelect.value.split('x');
            const width = parseInt(resolution[0]);
            const height = parseInt(resolution[1]);
            const framerate = parseInt(exportFramerateSelect.value);

            // 2. Erstelle ein Canvas-Element in der gewünschten Größe
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');

            // 3. Erstelle einen MediaStream aus dem Canvas
            const stream = canvas.captureStream(framerate);

            // 4. Erstelle einen MediaRecorder
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' }); //VP9 Codec
            let chunks = []; //Speichert die Daten

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data); //Daten hinzufügen
                }
            };

            recorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'video/webm' });
              resolve(blob); //Promise mit dem Blob als Ergebnis auflösen
            };

            recorder.onerror = (error) => {
                console.error("Fehler beim Encodieren des Videos:", error);
                reject(error); // Promise ablehnen, wenn Fehler auftritt
            };
            recorder.start();
            // 5. Zeichne die Frames auf das Canvas (asynchron)
            let currentTime = startTime;
            const frameDuration = 1 / framerate;

           function drawFrame() {
              // Berechne die aktuelle Zeit relativ zum Startzeitpunkt des Exports.
              let currentTime = startTime;
              // Zeichne die Frames auf das Canvas (asynchron, mit requestAnimationFrame)
              function drawFrame() {
                // Berechne die aktuelle Zeit relativ zum Startzeitpunkt des Exports.
                let currentTime = startTime; //Sicherstellen das alles bei 0 anfängt
                //Zeichne aktuellen Frame
                drawVideoFrame(context, width, height, currentTime);

                currentTime += frameDuration; //Erhöhe Zeit

                if (endTime !== null && currentTime < endTime) { //Prüfe, ob die Endzeit erreicht wurde
                  // Fordere den nächsten Frame an, solange das Ende nicht erreicht ist
                    requestAnimationFrame(drawFrame); // Nächsten Frame anfordern
                } else {
                  // Stoppe die Aufnahme, wenn das Ende erreicht ist
                    recorder.stop();
                }
             }
               drawFrame(); //Ersten Frame zeichnen
           }
           drawFrame(); // Starte die Zeichenschleife
        });
    }

    function drawVideoFrame(context, width, height, currentTime) {
      // Canvas leeren
        context.clearRect(0, 0, width, height);

        // Zeichne alle sichtbaren Video- und Bildspuren
        for (const track of tracks) {
            if (track.type === 'video' || track.type === 'image') {
               const trackStart = track.startTime;
               const trackEnd = track.startTime + track.duration;
                // Überprüfen, ob aktueller Zeitpunkt innerhalb der Spur liegt.
              if(currentTime >= trackStart && currentTime <= trackEnd){
                const media = track.mediaElement;

                // Berechne die Position und Größe für das Zeichnen
                let drawWidth = media.videoWidth || media.width; //  Breite
                let drawHeight = media.videoHeight || media.height;// Höhe
                let x = 0;
                let y = 0;

                // Passe die Größe an, um das Seitenverhältnis beizubehalten,
                const videoRatio = drawWidth / drawHeight;
                const canvasRatio = width / height;

                if (videoRatio > canvasRatio) {
                    // Video ist breiter als der Canvas
                    drawHeight = height;
                    drawWidth = height * videoRatio;
                    x = (width - drawWidth) / 2; // Zentrieren
                } else {
                    // Video ist höher oder gleich breit wie der Canvas
                    drawWidth = width;
                    drawHeight = width / videoRatio;
                    y = (height - drawHeight) / 2; // Zentrieren
                }

                // Wende CSS-Filter an (Helligkeit, Kontrast, etc.)
                context.filter = track.mediaElement.style.filter;
                // Zeichne das Video-/Bildelement auf den Canvas.
                context.drawImage(media, x, y, drawWidth, drawHeight);

                // Setze den Filter zurück, um andere Elemente nicht zu beeinflussen
                context.filter = 'none';
              }
            }
        }
    }

    async function exportAudio(format, startTime = 0, endTime = null) {
        if (tracks.length === 0) {
            throw new Error('Keine Spuren zum Exportieren vorhanden.'); // Sinnvolle Fehlermeldung
        }

        // 1. Bestimme die Länge des resultierenden Audiobuffers (in Samples)
        let maxLength = 0;
        for (const track of tracks) {
            if (

            if (track.type === 'audio') { // Nur Audiospuren berücksichtigen
                const trackEndTime = track.startTime + track.duration;
                maxLength = Math.max(maxLength, trackEndTime);
            }
        }

        // Berücksichtige den Export-Zeitbereich (startTime, endTime)
        const actualEndTime = endTime !== null ? Math.min(endTime, maxLength) : maxLength; //Kleinster Wert
        const duration = Math.max(0, actualEndTime - startTime); // Sicherstellen: Nicht negativ

        // 2. Erstelle einen OfflineAudioContext (für *alle* Spuren)
        const offlineContext = new OfflineAudioContext(
            2, // Anzahl der Kanäle (Stereo) – Anpassen, falls nötig!
            Math.floor(duration * audioContext.sampleRate), // Länge in Samples
            audioContext.sampleRate // Gleiche Samplerate wie der originale Kontext
        );

        // 3. Verbinde alle Audiospuren mit dem OfflineAudioContext (und wende Effekte an!)
        for (const track of tracks) {
            if (track.type === 'audio' && track.audioBuffer) { // Stelle sicher, dass es ein Audio-Track ist
                // Erstelle einen BufferSourceNode für den Track
                const source = offlineContext.createBufferSource();
                source.buffer = track.audioBuffer; // Verwende den *originalen* AudioBuffer

                // Wende Effekte an (tiefe Kopie, um Original nicht zu verändern)
                const gainNode = offlineContext.createGain();
                const pannerNode = offlineContext.createStereoPanner();
                const filterNode = offlineContext.createBiquadFilter(); //Hinzugefügt

                // Verbinde die Nodes (in der richtigen Reihenfolge)
                source.connect(gainNode);
                gainNode.connect(pannerNode);
                pannerNode.connect(filterNode)
                filterNode.connect(offlineContext.destination);


                // Werte setzen (aus track.effectValues)
                gainNode.gain.value = track.effectValues.volume;
                pannerNode.pan.value = track.effectValues.panning;
                filterNode.type = track.effectValues.filterType;
                filterNode.frequency.value = track.effectValues.filterCutoff;


                // Berechne die Startzeit *relativ* zum Export-Startpunkt
                let trackStartTime = track.startTime - startTime; // Differenz
                trackStartTime = Math.max(0, trackStartTime);      // Stelle sicher, dass sie nicht negativ ist

                // Starte die Wiedergabe der Spur zum richtigen Zeitpunkt
                source.start(trackStartTime);
            }
        }

        // 4. Rendere den OfflineAudioContext (asynchron!)
        return new Promise((resolve, reject) => {
            offlineContext.startRendering().then(async (renderedBuffer) => { // Rendern starten

                // 5. Konvertiere den gerenderten AudioBuffer in das gewünschte Format (WAV oder MP3)
                let audioBlob;
                if (format === 'wav') {
                    audioBlob = await audioBufferToBlob(renderedBuffer, 'audio/wav');
                } else if (format === 'mp3') {
                    // MP3-Encoding im Web Worker (LAMEjs)
                    audioWorker.postMessage({ type: 'encodeAudio', data: { audioBuffer: renderedBuffer, bitRate: parseInt(exportAudioBitrateSelect.value) } }); //bitRate

                    audioBlob = await new Promise((resolveWorker, rejectWorker) => { //auf Worker warten
                      audioWorker.onmessage = (event) => {
                        if (event.data.type === 'mp3Blob') {
                          resolveWorker(event.data.mp3Blob); // Bei Erfolg -> Promise auflösen
                        } else if (event.data.type === 'error') {
                          rejectWorker(new Error(event.data.message)); // Bei Fehler -> Promise ablehnen
                        }
                      };
                       audioWorker.onerror = (error) => { // Fehler im Worker abfangen
                            console.error("Worker error:", error);
                            rejectWorker(error); // Fehler weiterleiten
                        };
                    });

                } else {
                    reject(new Error('Ungültiges Audioformat')); // Fehler, falls ungültiges Format
                    return;
                }
              resolve(audioBlob);
            }).catch(reject); // Fehler beim Rendern abfangen
        });
    }

     // --- Export Image --- (Beispiel für aktuellen Frame)
    function exportImage(format) {
        const canvas = document.createElement('canvas'); // Canvas erstellen
        canvas.width = 1920; // Standardauflösung, anpassen
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');

        // Zeichne die *sichtbaren* Video- und Bildspuren auf das Canvas
        for (const track of tracks) {
            if ((track.type === 'video' || track.type === 'image') && track.mediaElement) {
              //Berechne die Zeit
              let currentTime = audioContext.currentTime;
              const trackStart = track.startTime;
              const trackEnd = track.startTime + track.duration;

              if(currentTime >= trackStart && currentTime <= trackEnd){ //Wenn Zeit im Track liegt
                // Einfache Zeichenoperation
                ctx.drawImage(track.mediaElement, 0, 0, canvas.width, canvas.height); //Anpassen für Seitenverhältnis
              }
            }
        }

        // Canvas-Inhalt als Blob exportieren (JPEG oder PNG)
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        let quality = 0.9; //Qualität für jpeg
        if(format === 'jpeg'){
          return canvas.toBlob((blob) => {
            resolve(blob);
          }, mimeType, quality);
        } else {
          return canvas.toBlob((blob) => {
            resolve(blob);
          }, mimeType);
        }
    }

    // --- Speichern und Laden ---
    function saveProject() {
        const projectData = {
            tracks: tracks.map(track => ({
                type: track.type,
                src: track.src, // URL des Blobs im Browser
                startTime: track.startTime,
                duration: track.duration,
                effectValues: track.effectValues, // Speichere *alle* Effekte!
                audioBuffer: track.type === 'audio' ? { // Speichere AudioBuffer-Daten *separat*
                    numberOfChannels: track.audioBuffer.numberOfChannels,
                    length: track.audioBuffer.length,
                    sampleRate: track.audioBuffer.sampleRate,
                    channelData: Array.from({ length: track.audioBuffer.numberOfChannels }, (_, i) => Array.from(track.audioBuffer.getChannelData(i))),
                } : null, // Keine Audiodaten für Video/Bild
                muted: track.muted, //hinzugefügt
                solo: track.solo, //hinzugefügt
            })),
            concertPitch: concertPitch,
            zoomLevel: zoomLevel,
            snapToGrid: snapToGrid,
            // ... (weitere globale Einstellungen) ...
        };

        const projectJson = JSON.stringify(projectData);

        // Download anbieten (als .esproj Datei)
        const blob = new Blob([projectJson], { type: 'application/json' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'echoel-project.esproj'; // .esproj als Dateiendung
        downloadLink.click();
        URL.revokeObjectURL(downloadLink.href); // URL wieder freigeben
    }

    async function loadProject(event) {
        const file = event.target.files[0];
        if (!file) {
            return;
        }
          if (file.name.split('.').pop() !== 'esproj') { //Dateiendung prüfen
            alert('Ungültiges Dateiformat. Bitte eine .esproj Datei auswählen.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const projectData = JSON.parse(e.target.result);

                // 1. Alles zurücksetzen (wichtig!)
                clearTimeline();
                resetGlobalSettings();

                // 2. Globale Einstellungen wiederherstellen
                concertPitch = projectData.concertPitch || 440;
                concertPitchInput.value = concertPitch;
                zoomLevel = projectData.zoomLevel || 1;
                snapToGridCheckbox.checked = projectData.snapToGrid || false;

                // 3. Spuren wiederherstellen (asynchron, da Blobs geladen werden müssen)
                const loadPromises = projectData.tracks.map(trackData => {
                    return getBlobFromUrl(trackData.src) // Blob laden
                        .then(blob => {
                            if (!blob) {
                                console.error("Blob konnte nicht wiederhergestellt werden:", trackData.src);
                                // Fehlerbehandlung: Benutzer informieren, Datei neu auswählen lassen, etc.
                                return; // Fehler, aber weiter mit den anderen Spuren
                            }

                          // Erstelle ein File-Objekt aus dem Blob (für Kompatibilität mit addMediaToTimeline)
                           const file = new File([blob], "media-file", { type: blob.type });

                            // Füge die Spur hinzu *ohne* erneutes Laden der Metadaten (die sind ja schon in trackData)
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
                     editorSection.style.display = 'block'; // Editor-Sektion anzeigen
                     exportSection.style.display = 'block';
                });
              //Fehler fangen
            } catch (error) {
                console.error("Fehler beim Laden des Projekts:", error);
                alert("Fehler beim Laden des Projekts. Die Datei ist möglicherweise beschädigt oder hat ein ungültiges Format.");
            }
        };
        reader.readAsText(file); // JSON-Datei als Text lesen
    }

    // Hilfsfunktion: Timeline leeren, bevor ein neues Projekt geladen wird
    function clearTimeline() {
      //DOM-Elemente entfernen
      audioTracksContainer.innerHTML = '';
      videoTracksContainer.innerHTML = '';
      imageTracksContainer.innerHTML = '';


      // Wavesurfer-Instanzen zerstören
      for(const trackId in wavesurferInstances){
        if(wavesurferInstances.hasOwnProperty(trackId)){
          wavesurferInstances[trackId].destroy();
        }
      }
      wavesurferInstances = {};

       // URLs freigeben (Speicherleck verhindern!)
        for (const track of tracks) {
            URL.revokeObjectURL(track.src);
        }

      tracks = []; //Leere Tracks
      currentTrackId = 0; // ID zurücksetzen
      selectedTracks = [];   // Auswahl zurücksetzen
    }

    // Hilfsfunktion: Globale Einstellungen zurücksetzen
    function resetGlobalSettings() {
        concertPitch = 440;
        concertPitchInput.value = concertPitch;
        zoomLevel = 1;
        snapToGridCheckbox.checked = false;
        // ... (weitere Einstellungen) ...
    }

    // --- Teilen von Projekten ---
    function shareProject() {
        // Speichere das Projekt (wie in saveProject)
        const projectData = {
             tracks: tracks.map(track => ({
                type: track.type,
                src: track.src, // URL des Blobs im Browser
                startTime: track.startTime,
                duration: track.duration,
                effectValues: track.effectValues, // Speichere *alle* Effekte!
                audioBuffer: track.type === 'audio' ? { // Speichere AudioBuffer-Daten *separat*
                    numberOfChannels: track.audioBuffer.numberOfChannels,
                    length: track.audioBuffer.length,
                    sampleRate: track.audioBuffer.sampleRate,
                    channelData: Array.from({ length: track.audioBuffer.numberOfChannels }, (_, i) => Array.from(track.audioBuffer.getChannelData(i))),
                } : null, // Keine Audiodaten für Video/Bild
                 muted: track.muted, //hinzugefügt
                solo: track.solo, //hinzugefügt
            })),
            concertPitch: concertPitch,
            zoomLevel: zoomLevel,
            snapToGrid: snapToGrid,
            // ... (weitere globale Einstellungen) ...
        };

        const projectJson = JSON.stringify(projectData);

        // Erstelle einen Blob aus den JSON-Daten.
        const blob = new Blob([projectJson], { type: 'application/json' });

        // Erstelle eine temporäre URL für den Blob.
        const url = URL.createObjectURL(blob);

        // Erstelle einen Link, der die URL als Parameter enthält (mit window.location)
        const shareLink = window.location.origin + window.location.pathname + '?project=' + encodeURIComponent(url);

        // Kopiere den Link in die Zwischenablage (mit navigator.clipboard)
        navigator.clipboard.writeText(shareLink).then(() => {
            alert('Projekt-Link in die Zwischenablage kopiert. Teile diesen Link, um das Projekt zu laden.');
        }).catch(err => {
            console.error('Fehler beim Kopieren in die Zwischenablage:', err);
            alert('Fehler beim Kopieren des Links. Bitte manuell kopieren.'); // Bessere Fehlermeldung
            // Optional: Link in einem Textfeld anzeigen, damit der Benutzer ihn manuell kopieren kann
        });
      //URL wieder freigeben!
       URL.revokeObjectURL(url);
    }

    // --- Laden von Projekten über URL-Parameter ---
    function loadProjectFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectUrl = urlParams.get('project');

        if (projectUrl) {
          fetch(projectUrl)
          .then(response => {
            if(!response.ok){ // Fehlerbehandlung, falls die Antwort nicht ok ist.
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
          })
          .then(projectData => {
             //Verarbeite die Projektdaten, stelle Spuren wieder her usw.
              clearTimeline();
              resetGlobalSettings();

              concertPitch = projectData.concertPitch || 440;
              concertPitchInput.value = concertPitch;
              zoomLevel = projectData.zoomLevel || 1;
              snapToGridCheckbox.checked = projectData.snapToGrid || false;

               const loadPromises = projectData.tracks.map(trackData => {
                    return getBlobFromUrl(trackData.src) // Blob laden
                        .then(blob => {
                            if (!blob) {
                                console.error("Blob konnte nicht wiederhergestellt werden:", trackData.src);
                                // Fehlerbehandlung: Benutzer informieren, Datei neu auswählen lassen, etc.
                                return; // Fehler, aber weiter mit den anderen Spuren
                            }

                          // Erstelle ein File-Objekt aus dem Blob (für Kompatibilität mit addMediaToTimeline)
                           const file = new File([blob], "media-file", { type: blob.type });

                            // Füge die Spur hinzu *ohne* erneutes Laden der Metadaten (die sind ja schon in trackData)
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

                    updateZoom();  // Zoom anpassen
                    update
                    updateTrackControls(); // Zeige die Einstellungen der ersten ausgewählten Spur an.
                     editorSection.style.display = 'block'; // Editor-Sektion anzeigen
                     exportSection.style.display = 'block';
                });
            })
            .catch(error => { // Fehlerbehandlung
                console.error("Fehler beim Laden des Projekts von URL:", error);
                alert("Fehler beim Laden des Projekts von der URL.");
            });
    }
}

    // --- Initialisierung der Export-Optionen ---
    function initializeExportOptions() {
      // Auflösungen (Beispiele - anpassen!)
      const resolutions = [
        { width: 1280, height: 720, label: "720p (HD)" },
        { width: 1920, height: 1080, label: "1080p (Full HD)" },
        { width: 3840, height: 2160, label: "4K (Ultra HD)" },
        { width: 640, height: 480, label: "640x480 (SD)" }, // Standard Definition
        { width: 854, height: 480, label: "480p (SD)" },   // 16:9 SD
      ];

      // Framerates (Beispiele)
      const framerates = [24, 30, 60, 29.97, 59.94];

      // Audio-Bitrates (Beispiele)
      const bitrates = [
        { value: 128000, label: "128 kbps" },
        { value: 192000, label: "192 kbps" },
        { value: 320000, label: "320 kbps" },
      ];

      // Optionen zu den Select-Elementen hinzufügen
      for (const res of resolutions) {
        const option = document.createElement('option');
        option.value = `${res.width}x${res.height}`;
        option.textContent = `${res.label} (${res.width}x${res.height})`;
        exportResolutionSelect.appendChild(option);
      }

      for (const fps of framerates) {
        const option = document.createElement('option');
        option.value = fps;
        option.textContent = `${fps} fps`;
        exportFramerateSelect.appendChild(option);
      }
      for (const rate of bitrates) {
        const option = document.createElement('option');
        option.value = rate.value;
        option.textContent = `${rate.label}`;
        exportAudioBitrateSelect.appendChild(option)
      }
    }
     //Debounce Funktion, damit Events nicht zu oft ausgelöst werden
    function debounce(func, wait) {
      let timeout;
      return function(...args) { //Rest Parameter
        const context = this;
        clearTimeout(timeout); //Wenn die Funktion wieder aufgerufen wird, wird der alte Timeout gelöscht
        timeout = setTimeout(() => func.apply(context, args), wait); //Neuer Timeout
      };
    }
    // --- Ende script.js ---
});
