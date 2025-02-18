// script.js  (VOLLSTÄNDIG und ÜBERARBEITET)

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
  const filterTypeSelect = document.getElementById('filter-type'); //hinzugefügt
  const filterCutoffSlider = document.getElementById('filter-cutoff'); //hinzugefügt
  const visualsModeSelect = document.getElementById('visuals-mode'); //Für die Auswahl
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
  const audioWorker = new Worker('worker.js'); // Worker Instanz

  let selectedTracks = [];
  let isDragging = false;
  let dragStartX = 0;
  let selectionDiv = document.createElement('div');
  selectionDiv.classList.add('selection-box');
  timeline.appendChild(selectionDiv);

  let copiedTrack = null; //für kopierte Tracks
  let undoStack = [];
  let redoStack = [];
  const MAX_UNDO_STATES = 50;
  let exportStartTime = 0;  // Standardwerte
  let exportEndTime = 0;

  // --- Initialisierungen ---

  // Kammerton (aus localStorage laden oder Standardwert setzen)
  let concertPitch = parseFloat(localStorage.getItem('concertPitch')) || 440;
  concertPitchInput.value = concertPitch;

  // Editor-Sektion anzeigen, Upload-Sektion ausblenden (für den direkten Start im Editor)
  editorSection.style.display = 'block';
  //uploadSection.style.display = 'none'; // Wird beim Laden wieder eingeblendet

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
  zoomInBtn.addEventListener('click', () => { zoomLevel *= 1.2; updateZoom(); }); //Korrektur
  zoomOutBtn.addEventListener('click', () => { zoomLevel /= 1.2; updateZoom(); });//Korrektur
  snapToGridCheckbox.addEventListener('change', () => { snapToGrid = snapToGridCheckbox.checked; });
  concertPitchInput.addEventListener('change', updateConcertPitch);
  detectPitchBtn.addEventListener('click', detectConcertPitch);
  detectKeyBtn.addEventListener('click', () => { //detectKey und detectBPM greifen nun auf den audioWorker zu
    if (selectedTracks.length > 0) {
      const trackId = selectedTracks[0];
      const track = tracks.find((t) => tt.id === trackId);
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
  timeline.addEventListener('dragover', handleDragOver); //Muss vorhanden sein, damit Drop funktioniert

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

    } else if (event.data.type === 'audioBuffer') { // *NEU*: Empfang des AudioBuffers
      // Konvertiere die empfangenen Daten zurück in einen AudioBuffer
      const audioBuffer = audioContext.createBuffer(
        event.data.numberOfChannels,
        event.data.length,
        event.data.sampleRate
      );
      for (let i = 0; i < event.data.numberOfChannels; i++) {
        audioBuffer.getChannelData(i).set(event.data.channelData[i]);
      }

      // Erstelle einen Blob aus dem AudioBuffer (optional, je nach Anwendungsfall)
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
      // URL für den Blob erstellen:
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); //Link erstellen
      a.href = url;
      a.download = 'exported_audio.mp3'; // Dateiname für den Download
      document.body.appendChild(a); // Link zum Dokument hinzufügen (notwendig für Firefox)
      a.click(); //Simuliere Klick
      document.body.removeChild(a); // Link entfernen
      URL.revokeObjectURL(url); // URL freigeben, um Speicher freizugeben
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


  // --- Hilfsfunktionen ---
  //Debounce Funktion, damit Events nicht zu oft ausgelöst werden.
  function debounce(func, wait) {
    let timeout;
    return function(...args) { //Rest Parameter
      const context = this;
      clearTimeout(timeout); //Wenn die Funktion wieder aufgerufen wird, wird der alte Timeout gelöscht
      timeout = setTimeout(() => func.apply(context, args), wait); //Neuer Timeout
    };
  }

  // Dateien einlesen (behandelt jetzt den Fortschritt)
  async function handleFiles(files) {
    uploadProgress.style.display = "block"; // Fortschrittsanzeige einblenden
    uploadProgress.querySelector("progress").value = 0; //Rücksetzen
    uploadProgressSpan.textContent = "Dateien werden geladen...";

    let fileCount = files.length; //Gesamtzahl an Dateien
    let loadedCount = 0; //Anzahl geladener Dateien

    for (const file of files) {
      try { // Fehlerbehandlung *innerhalb* der Schleife
        if (file.type.startsWith('audio')) {
          const audioBuffer = await getAudioBufferFromFile(file); // await *innerhalb* der Schleife
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
        alert(`Fehler beim Laden von ${file.name}. Bitte stelle sicher, dass es sich um eine unterstützte Mediendatei handelt.`);
      }
      loadedCount++;
      uploadProgress.querySelector("progress").value = (loadedCount / fileCount) * 100; //Fortschritt
    }
    uploadProgressSpan.textContent = "Dateien geladen!";
    setTimeout(() => {
      uploadProgress.style.display = "none";
    }, 2000); //Fortschrittsanzeige ausblenden
    editorSection.style.display = 'block';
    exportSection.style.display = 'block';
  }

  //Audiobuffer erstellen
  function getAudioBufferFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        audioContext.decodeAudioData(event.target.result, resolve, reject); //Promise
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
      const response = await fetch(url);  // Kein no-cors mehr
      if (response.ok) {
        return await response.blob();
      } else {
        console.error("Fehler beim Abrufen des Blobs (Status):", response.status);
        return null; // Fehlerfall
      }
    } catch (error) {
      console.error("Fehler beim Abrufen des Blobs (URL/Netzwerk):", error);
      return null; // Fehlerfall
    }
  }


  // --- Funktionen für die Aufnahme ---

  function startRecording(stream, type) {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop(); // Stoppe eine laufende Aufnahme
    }

    mediaRecorder = new MediaRecorder(stream); // Erstelle neuen MediaRecorder
    recordedChunks = []; // Leere das Array

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data); // Sammle Daten
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: type === 'audio' ? 'audio/webm' : 'video/webm' }); // Blob erstellen

      let audioBuffer; //Deklarieren ausserhalb von try
      if (type === 'audio') {
        try {
          audioBuffer = await getAudioBufferFromFile(blob); //Asynchron
          addMediaToTimeline(blob, 'audio', audioBuffer); // Neue Audiospur
        } catch (error) {
          console.error("Fehler beim Decodieren der Aufnahme:", error);
          alert("Fehler beim Verarbeiten der Aufnahme.");
          return; // Stoppe bei Fehler
        }
      } else {
        addMediaToTimeline(blob, type); // Neue Video- oder Bildspur
      }

      // Stream *sofort* stoppen, *nachdem* der Blob erstellt wurde:
      stream.getTracks().forEach(track => track.stop());
      editorSection.style.display = 'block';
      exportSection.style.display = 'block';
    };

    mediaRecorder.onerror = (error) => { // Fehlerbehandlung
      console.error("Fehler bei der Aufnahme:", error);
      alert(`Fehler bei der Aufnahme (${type}): ${error.message}`);
      stream.getTracks().forEach(track => track.stop());//Stream stoppen
    };

    mediaRecorder.start(); // Aufnahme starten
    // Optional: Visuelles Feedback
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


    // Event-Listener für die Spur (Auswahl, etc.) *innerhalb* von addMediaToTimeline
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
          track.gainNode.gain.value = trackData.effectValues.volume;
          // Wiederherstellen von Filter, falls vorhanden
          if (trackData.effectValues.filterType !== undefined && track.filterNode) {
            track.filterNode.type = trackData.effectValues.filterType;
            filterTypeSelect.value = trackData.effectValues.filterType; // Wert im Auswahlfeld aktualisieren
          }
          if (trackData.effectValues.filterCutoff !== undefined && track.filterNode) {
            track.filterNode.frequency.value = trackData.effectValues.filterCutoff;
            filterCutoffSlider.value = trackData.effectValues.filterCutoff; // Wert im Schieberegler aktualisieren
          }
          track.pannerNode.pan.value = trackData.effectValues.panning;

          // ... (andere Audio-Effekte) ...

        } else if (track.type === 'video' || track.type === 'image') {

          if (trackData.effectValues.brightness !== undefined) {
            brightnessSlider.value = trackData.effectValues.brightness
          }
          if (trackData.effectValues.contrast !== undefined) {
            contrastSlider.value = trackData.effectValues.
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
            updateTrackDisplay(track); //Visuelle Darstellung sofort aktualisieren
        }

         updateTrackDisplay(track); // *Immer* aufrufen (Position/Größe setzen)
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
            mediaElement = document.createElement(type);  // <audio> oder <video>
            mediaElement.src = url;
            mediaElement.controls = false; // Eigene Controls verwenden
            trackElement.appendChild(mediaElement);

            sourceNode = audioContext.createMediaElementSource(mediaElement); // Für Effekte!

        } else if (type === 'image') {
            const imgElement = document.createElement('img');
            imgElement.src = url;
            trackElement.appendChild(imgElement);
            mediaElement = imgElement; // Einheitliche Variable für alle Medientypen
        }

        // Audio-Nodes (nur *einmal* erstellen, *nicht* mehrfach!)
        const gainNode = audioContext.createGain();     // Lautstärke
        const pannerNode = audioContext.createStereoPanner(); // Stereo-Panning
        const filterNode = audioContext.createBiquadFilter(); //hinzugefügt

        // Verbinde die Nodes (für alle hörbaren Tracks)
        if (sourceNode) {
            sourceNode.connect(gainNode);
            gainNode.connect(pannerNode);
            pannerNode.connect(filterNode)
            filterNode.connect(audioContext.destination);
            //Verbinde mit analyser Node für alle hörbaren Tracks
            //pannerNode.connect(analyser);
        }
         //Anfangswerte setzen
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 350;


        const track = {
            id: trackId,
            type: type,
            src: url,
            audioBuffer: audioBuffer || null, // Kann null sein (bei Video/Bild)
            startTime: (trackData && trackData.startTime) || 0, // Wichtig für Position!
            duration: (trackData && trackData.duration) || 0, // Standardwert (wird überschrieben)
            element: trackElement,        // Das DOM-Element (<div>)
            mediaElement: mediaElement,   // Das <audio>, <video> oder <img> Element
            sourceNode: sourceNode,        // Für Audio/Video, kann null sein (bei Bildern)
            gainNode: gainNode,           // Für Lautstärke
            pannerNode: pannerNode,        // Für Panning
            filterNode: filterNode,
            analyserNode: type === 'audio' || type === 'video' ? analyser : null, // Optional
            effectValues: {               // Anfangswerte (später wichtig für Speichern/Laden/Undo)
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
        track.element.addEventListener('dragstart', handleDragStart); //Verschieben
        track.element.addEventListener('click', (event) => {  //Auswählen
            selectTrack(track.id, event);
        });
        // Weitere Listener hier hinzufügen (z.B. Doppelklick für Details, Kontextmenü, etc.)
    }


    // --- Update Track Display (angepasst) ---

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
            filterString += `contrast(${track.effectValues.contrast || 1}) `;      // usw.
            filterString += `saturate(${track.effectValues.saturation || 1}) `;
            filterString += `hue-rotate(${track.effectValues.hue || 0}deg) `;
            // ... (weitere Filter) ...

            track.mediaElement.style.filter = filterString;
            track.mediaElement.style.opacity = track.effectValues.transparency || 1; // Deckkraft

        } else if (track.type === 'audio') { //auch für Audio
            // Stelle sicher, dass gainNode initialisiert ist (sollte es sein, aber sicher ist sicher)
            if (!track.gainNode) {
                console.warn("gainNode nicht initialisiert für Track:", track);
                return; // Abbruch, wenn gainNode fehlt
            }
            // Aktualisiere Lautstärke/Panning
            track.gainNode.gain.value = track.effectValues.volume || 1;
            track.pannerNode.pan.value = track.effectValues.panning || 0;
            //FilterNodes, wenn vorhanden
            if (track.filterNode) {
              track.filterNode.type = track.effectValues.filterType || 'lowpass';
              track.filterNode.frequency.value = track.effectValues.filterCutoff || 350;
            }
        }
    }


    // --- Audio-Nodes verbinden (wichtig für Effekte) ---

    function connectTrackNodes(track) {
        if (!track.sourceNode) {
            console.warn("Kann Audio-Nodes nicht verbinden, da SourceNode nicht vorhanden ist:", track);
            return;
        }

        // Nodes nur erstellen, wenn sie *nicht* existieren (wichtig für Performance!)
        if (!track.gainNode) {
            track.gainNode = audioContext.createGain();
        }
        if (!track.pannerNode) {
            track.pannerNode = audioContext.createStereoPanner();
        }
        if (!track.filterNode) {
            track.filterNode = audioContext.createBiquadFilter();
        }

        // Stelle sicher, dass die Nodes nicht bereits verbunden sind (vermeide Fehler!)
        track.sourceNode.disconnect();
        track.gainNode.disconnect();
        track.pannerNode.disconnect();
        track.filterNode.disconnect();


        // Verbinde die Nodes in der richtigen Reihenfolge
        track.sourceNode.connect(track.gainNode);
        track.gainNode.connect(track.pannerNode);
        track.pannerNode.connect(track.filterNode);
        track.filterNode.connect(audioContext.destination); // Immer mit dem *globalen* Kontext!
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
            filterTypeSelect.value = track.effectValues.filterType; // Wert im Auswahlfeld aktualisieren
            filterCutoffSlider.value = track.effectValues.filterCutoff;// Wert im Schieberegler aktualisieren
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
      for (const trackId of selectedTracks) {
        updateTrackEffects(trackId, 'brightness', parseFloat(brightnessSlider.value));
      }
    });
    contrastSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks) {
        updateTrackEffects(trackId, 'contrast', parseFloat(contrastSlider.value));
      }
    });
    saturationSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks) {
        updateTrackEffects(trackId, 'saturation', parseFloat(saturationSlider.value));
      }
    });
    hueSlider.addEventListener('input', () => {
      for (const trackId of selectedTracks) {
        updateTrackEffects(trackId, 'hue', parseFloat(hueSlider.value));
      }
    });
    transparencySlider.addEventListener('input', () => {
      for (const trackId of selectedTracks) {
        updateTrackEffects(trackId, 'transparency', parseFloat(transparencySlider.value));
      }
    });
    filterTypeSelect.addEventListener('change', () => { //Für Filter Auswahl
      for (const trackId of selectedTracks) {
        updateTrackEffects(trackId, 'filterType', filterTypeSelect.value);
      }
    });

    filterCutoffSlider.addEventListener('input', () => { //Für Filter Frequenz
      for (const trackId of selectedTracks) {
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
          // Weitere Audio-Effekte hier hinzufügen (z.B. Delay, Reverb, etc. - erfordert mehr Nodes)
        }
        connectTrackNodes(track); //Nodes verbinden
      } else if (track.type === 'video' || track.type === 'image') {
        // Video/Bild-Effekte (CSS-Filter)
        let filterString = '';
        filterString += `brightness(${track.effectValues.brightness || 1}) `; // Default-Werte
        filterString += `contrast(${track.effectValues.contrast || 1}) `;
        filterString += `saturate(${track.effectValues.saturation || 1}) `;
        filterString += `hue-rotate(${track.effectValues.hue || 0}deg) `;
        // ... (weitere Filter) ...

        track.mediaElement.style.filter = filterString; // CSS-Filter anwenden
        track.mediaElement.style.opacity = track.effectValues.transparency || 1; // Deckkraft
      }

      updateTrackDisplay(track); // Wichtig: Visuelle Darstellung *immer* aktualisieren
    }


    // --- Abspielcursor ---

    function updateCursor() {
      if (isPlaying && audioContext) {
        const currentTime = audioContext.currentTime; // Aktuelle Zeit
        cursor.style.left = `${currentTime * 50 * zoomLevel}px`; // Skalierung
        requestAnimationFrame(updateCursor); // Nächsten Frame anfordern
      }
    }


    // --- Funktion zum Abspielen/Pausieren ---
    function togglePlayPause() {
      if (isPlaying) {
        // Pause
        if (audioContext.state === 'running') { // Zustand prüfen
          audioContext.suspend().then(() => {
            isPlaying = false;
            playPauseBtn.textContent = 'Play';
            // Keine Cursorbewegung mehr
          });
        }
      } else {
        // Play
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => { // .then für Promise
            isPlaying = true;
            playPauseBtn.textContent = 'Pause';
            updateCursor(); // Cursorbewegung starten

            // Starte die Medienwiedergabe für *alle* Spuren
            for (const track of tracks) {
              if (track.mediaElement && (track.type === 'audio' || track.type === 'video')) {
                // NEU: Berechnung der korrekten Startzeit relativ zur Timeline-Position
                const timelinePosition = parseFloat(track.element.style.left) / (50 * zoomLevel); // Absolute Position in Sekunden, durch Skalierungsfaktor
                const startTime = Math.max(0, audioContext.currentTime - (track.startTime + timelinePosition));  // Zeit relativ zur Spur, nicht negativ
                track.mediaElement.currentTime = startTime;
                track.mediaElement.play().catch(err => { // Fehler abfangen (Promise)
                  console.error(`Fehler beim Abspielen von

