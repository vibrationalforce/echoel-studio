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
 ${track.type} (Track ID ${track.id}):`, err);
                });
              }
            }
          });
        } else if (audioContext.state === 'closed') { // *NEU*: Behandlung für geschlossenen Kontext
          // Behandle den Fall, dass der AudioContext geschlossen wurde
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioContext.createAnalyser(); //Muss neu erstellt werden
          analyser.fftSize = 2048;
          isPlaying = true;
          playPauseBtn.textContent = 'Pause';
          updateCursor(); // Cursorbewegung

          // Starte die Medienwiedergabe für *alle* Spuren
          for (const track of tracks) {
            if (track.mediaElement && (track.type === 'audio' || track.type === 'video')) {
              // NEU: Berechnung der korrekten Startzeit relativ zur Timeline-Position
              const timelinePosition = parseFloat(track.element.style.left) / (50 * zoomLevel);
              const startTime = Math.max(0, audioContext.currentTime - timelinePosition);
              track.mediaElement.currentTime = startTime;
              track.mediaElement.play().catch(err => { // Fehler abfangen (Promise)
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
          element: null, // Wird neu erstellt in addMediaToTimeline
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
          element: null, //wird neu erstellt
        };
        tracks.push(secondTrack);
        // Alte URL freigeben (WICHTIG!)
        URL.revokeObjectURL(track.src);

        // 9. Zeitleiste aktualisieren (DOM)
        track.element.remove();
        addMediaToTimeline(firstBlob, 'video', null, newTrack); //Ersten Track hinzufügen
        addMediaToTimeline(secondBlob, 'video', null, secondTrack); // Zweiten Track hinzufügen


      } else if (track.type === 'image') {
        // Bilder können nicht geschnitten werden.
        console.warn("Bilder können nicht geschnitten werden.");
      }
    }

    // --- Löschen ---
    function deleteSelectedTracks() {
      if (selectedTracks.length === 0) return;
      saveStateForUndo();
      const tracksToDelete = [...selectedTracks];

      for (const trackId of tracksToDelete) {
        deleteTrack(trackId);
      }
      selectedTracks = [];
      updateTrackControls();
    }

    function deleteTrack(trackId) {
      const track = tracks.find(t => t.id === trackId);
      if (!track) return;

      track.element.remove(); // Entfernt Element aus der Timeline

      if (wavesurferInstances[trackId]) {
        wavesurferInstances[trackId].destroy();
        delete wavesurferInstances[trackId];
      }

      URL.revokeObjectURL(track.src); // Gibt Speicher frei, der durch Blob-URL belegt wird
      tracks = tracks.filter(t => t.id !== trackId); //Entfernt die Spur aus dem tracks-Array
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
      const currentState = {
        tracks: JSON.parse(JSON.stringify(tracks)),  // Tiefe Kopie
        zoomLevel: zoomLevel,
        selectedTracks: [...selectedTracks], // Kopie
      };
      undoStack.push(currentState);
      if (undoStack.length > MAX_UNDO_STATES) {
        undoStack.shift(); // Älteste entfernen
      }
      redoStack = []; // Redo-Stack leeren
    }

    function undo() {
      if (undoStack.length === 0) return;

      const previousState = undoStack.pop();
      redoStack.push(getCurrentState());
      restoreState(previousState);
    }

    function redo() {
      if (redoStack.length === 0) return;

      const nextState = redoStack.pop();
      undoStack.push(getCurrentState());
      restoreState(nextState);
    }

    function getCurrentState() {
      return {
        tracks: JSON.parse(JSON.stringify(tracks)), // Tiefe Kopie
        zoomLevel: zoomLevel,
        selectedTracks: [...selectedTracks], // Kopie
      };
    }

    function restoreState(state) {
      clearTimeline();
      zoomLevel = state.zoomLevel;
      selectedTracks = state.selectedTracks;

      const loadPromises = state.tracks.map(trackData => {
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
              addMediaToTimeline(file, trackData.type, null, trackData);
            }
          });
      });
      Promise.all(loadPromises).then(() => { //Wenn alles geladen wurde
        updateZoom();
        updateTrackControls();
        editorSection.style.display = 'block';//Editor Anzeigen
        exportSection.style.display = 'block';
      });
    }

    //Alles zurücksetzen
    function clearTimeline() {
      //DOM-Elemente entfernen
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

      tracks = []; //Tracks leeren
      currentTrackId = 0;
      selectedTracks = []; //Auswahl leeren
    }

    // Globale Einstellungen zurücksetzen
    function resetGlobalSettings() {
      concertPitch = 440;
      concertPitchInput.value = concertPitch;
      zoomLevel = 1;
      snapToGridCheckbox.checked = false;
    }
    // --- Verschieben von Sp    // --- Verschieben von Spuren (Drag-and-Drop-Handler) ---

    let draggedTrack = null; // Das aktuell gezogene Track-Objekt

    function handleDragStart(event) {
        const trackId = parseInt(event.target.dataset.trackId);
        draggedTrack = tracks.find(t => t.id === trackId);

        if (!draggedTrack) {
            event.preventDefault(); // Verhindere das Ziehen, wenn kein Track gefunden wurde
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

      draggedTrack.element.classList.remove('dragging'); // Feedback entfernen
      draggedTrack = null; // Zurücksetzen
      saveStateForUndo(); //Speichern für Undo
    }

    // --- Zoomen ---

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
     //Mausrad
    function handleTimelineWheel(event) {
        event.preventDefault(); // Standardverhalten (Scrollen) verhindern

        // Zoom-Faktor (stärker als vorher)
        const delta = event.deltaY > 0 ? 0.9 : 1.1;  // Mausrad nach unten/oben
        zoomLevel *= delta;
        updateZoom(); //oder debounced Version
    }

     //Debounce Funktion, damit nicht zu viele Events gefeuert werden.
     const debouncedUpdateZoom = debounce(updateZoom, 50); //kürzere Reaktionszeit


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
             audioContext.resume().then(() => { //Context Zustand prüfen
              audioContext.currentTime = clickTime; // Zeit setzen
            });
        } else {
          audioContext.currentTime = clickTime;
        }

        // Bewege den Cursor an die neue Position (visuell)
        cursor.style.left = `${clickX}px`;

        // Starte die Wiedergabe, falls nicht schon aktiv
        if (!isPlaying) {
            togglePlayPause();
        }
    }


      // --- Audio-Analyse (Tonart, BPM, Kammerton) ---
      // Web-Worker Funktionen
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
      concertPitchInput.value = frequency.toFixed(1); //Eingabefeld aktualisieren
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

      const mode = visualsModeSelect.value; // Aktuellen Modus abrufen

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
        // Spektralanzeige (als durchgezogene Linie)
        visualsContext.beginPath();
        visualsContext.moveTo(0, visualsCanvas.height);
        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] * (visualsCanvas.height / 255);
          let y = visualsCanvas.height - barHeight;
          visualsContext.lineTo(i * (visualsCanvas.width / bufferLength), y);
        }
        visualsContext.lineTo(visualsCanvas.width, visualsCanvas.height);
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
    if (visualsModeSelect) { //Stelle sicher, dass das Element existiert.
      visualsModeSelect.addEventListener('change', () => {
        if (visualsModeSelect.value !== 'off') {
          // Starte die Visualisierung, falls sie nicht schon läuft
          if (!isPlaying) {
            togglePlayPause(); // Starte die Wiedergabe (und damit die Visualisierung)
            // Keine zusätzliche Logik hier, da updateCursor die Visualisierung aktualisiert
          }
        }
      });
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

        exportProgress.style.display = "block"; // Fortschrittsanzeige ein
        exportProgress.querySelector("progress").value = 0;
        exportProgressSpan.textContent = "Exportiere...";
        exportMessageDiv.textContent = ''; // Meldungen zurücksetzen

        try {
            if (exportFormat === 'mp4') {
              // VIDEO-EXPORT mit ffmpeg.wasm
              if (!ffmpeg || !ffmpeg.isLoaded()) {
                alert("FFmpeg wird noch geladen oder ist nicht verfügbar. Bitte versuche es in Kürze erneut, oder verwende ein anderes Exportformat (WebM).");
                exportProgress.style.display = "none"; // Fortschrittsanzeige ausblenden
                return; // Abbruch
              }
              await exportVideoWithFFmpeg(exportStartTime, exportEndTime, videoFormat); // Aufruf


            } else if (exportFormat === 'webm') {
              // VIDEO-EXPORT (WebM direkt)
              const videoBlob = await captureVideoFramesAsWebM(exportStartTime, exportEndTime);
              const downloadLink = document.createElement('a');
              downloadLink.href = URL.createObjectURL(videoBlob);
              downloadLink.download = 'export.webm'; // Dateiname
              downloadLink.click(); // Download auslösen
              URL.revokeObjectURL(downloadLink.href);

            } else if (exportFormat === 'mp3' || exportFormat === 'wav') {
                // AUDIO-EXPORT
                const audioBlob = await exportAudio(exportFormat, exportStartTime, exportEndTime);
                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(audioBlob);
                downloadLink.download = `export.${exportFormat}`;
                downloadLink.click();
                URL.revokeObjectURL(downloadLink.href); // URL freigeben

            } else if (exportFormat === 'jpeg' || exportFormat === 'png') {
                // BILD-EXPORT
                const imageBlob = exportImage(exportFormat);

                const downloadLink = document.createElement('a');
                downloadLink.href = URL.createObjectURL(imageBlob);
                downloadLink.download = 'export.' + exportFormat;
                downloadLink.click();
                URL.revokeObjectURL(downloadLink.href);
            }

            exportProgress.querySelector("progress").value = 100; // Fortschritt auf 100%
            exportProgressSpan.textContent = "Export abgeschlossen!";
            setTimeout(() => { exportProgress.style.display = "none"; }, 2000); // Ausblenden

        } catch (error) {
            console.error("Fehler beim Export:", error);
            alert("Fehler beim Export: " + error.message);
            exportMessageDiv.textContent = "Export fehlgeschlagen: " + error.message;
            exportProgress.style.display = "none"; // Fortschrittsanzeige ausblenden
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
      // Canvas leeren (wichtig, um vorherige Frames zu entfernen)
      context.clearRect(0, 0, width, height);

      // Zeichne alle *sichtbaren* Video- und Bildspuren
      for (const track of tracks) {
        if (track.type === 'video' || track.type === 'image') {
          const trackStart = track.startTime;
          const trackEnd = track.startTime + track.duration;
          // Überprüfe, ob der aktuelle Zeitpunkt innerhalb der Spur liegt.
          if (currentTime >= trackStart && currentTime <= trackEnd) {
            const media = track.mediaElement;

            // Berechne die Position und Größe für das Zeichnen (unter Berücksichtigung von Seitenverhältnis und 'object-fit')
            let drawWidth = media.videoWidth || media.width; //  Breite (Video oder Bild)
            let drawHeight = media.videoHeight || media.height;// Höhe
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
            context.filter = track.mediaElement.style.filter; // Übernimm CSS-Filter
            // Zeichne das Video-/Bildelement auf den Canvas. Berücksichtige die aktuelle Zeit
            context.drawImage(media, x, y, drawWidth, drawHeight);

            // Setze den Filter *unbedingt* zurück, um andere Elemente nicht zu beeinflussen!
            context.filter = 'none';
          }
        }
      }
    }

    //Audio Exportieren
    async function exportAudio(format, startTime = 0, endTime = null) {
        if (tracks.length === 0) {
            throw new Error('Keine Spuren zum Exportieren vorhanden.');
        }

        // 1. Bestimme die Länge des resultierenden Audiobuffers (in Samples)
        let maxLength = 0;
        for (const track of tracks) {
            if (track.type === 'audio') {
                const trackEndTime = track.startTime + track.duration;
                maxLength = Math.max(maxLength, trackEndTime); // Maximum
            }
        }

        // Berücksichtige den Export-Zeitbereich (startTime, endTime)
        const actualEndTime = endTime !== null ? Math.min(endTime, maxLength) : maxLength;
        const duration = Math.max(0, actualEndTime - startTime); // Sicherstellen: Nicht negativ


        // 2. Erstelle einen OfflineAudioContext (für *alle* Spuren)
        const offlineContext = new OfflineAudioContext(
            2, // Anzahl der Kanäle (Stereo)
            Math.floor(duration * audioContext.sampleRate), // Länge in Samples
            audioContext.sampleRate // Gleiche Samplerate wie der originale Kontext
        );

        // 3. Verbinde alle Audiospuren mit dem OfflineAudioContext (und wende Effekte an!)
        for (const track of tracks) {
            if (track.type === 'audio' && track.audioBuffer) { // Nur Audiospuren
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
                pannerNode.connect(filterNode);
                filterNode.connect(offlineContext.destination);


                // Werte setzen (aus track.effectValues)
                gainNode.gain.value = track.effectValues.volume;
                pannerNode.pan.value = track.effectValues.panning;
                filterNode.type = track.effectValues.filterType;
                filterNode.frequency.value = track.effectValues.filterCutoff;

                // Berechne die Startzeit *relativ* zum Export-Startpunkt
                let trackStartTime = track.startTime - startTime;
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
      const canvas = document.createElement('canvas');
      canvas.width = 1920; //  Auflösung, anpassen
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');

      // Zeichne die *sichtbaren* Video- und Bildspuren auf das Canvas
      for (const track of tracks) {
        if ((track.type === 'video' || track.type === 'image') && track.mediaElement) {
          //Berechne die Zeit
          let currentTime = audioContext.currentTime;
          const trackStart = track.startTime;
          const trackEnd = track.startTime + track.duration;

          if (currentTime >= trackStart && currentTime <= trackEnd) { //Wenn Zeit im Track liegt
            // Einfache Zeichenoperation
            ctx.drawImage(track.mediaElement, 0, 0, canvas.width, canvas.height); //Anpassen für Seitenverhältnis
          }
        }
      }

      // Canvas-Inhalt als Blob exportieren (JPEG oder PNG)
      const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      let quality = 0.9; //Qualität für jpeg
      if (format === 'jpeg') {
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
// worker.js

// WICHTIG: Libraries im Worker importieren:
importScripts("https://unpkg.com/@tonaljs/tonal@4.13.0/browser/tonal.min.js");
importScripts("https://cdn.jsdelivr.net/npm/meyda@latest/dist/web/meyda.min.js");
importScripts("https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js");

self.onmessage = async (event) => {
    const { type, data } = event.data;

    if (type === 'detectKey') {
        try {
            const key = await detectKey(data.audioBuffer);
            self.postMessage({ type: 'keyResult', key });
        } catch (error) {
            self.postMessage({ type: 'error', message: 'Fehler bei der Tonarterkennung: ' + error.message });
        }
    } else if (type === 'detectBPM') {
        try {
            const bpm = await detectBPM(data.audioBuffer);
            self.postMessage({ type: 'bpmResult', bpm });
        } catch (error) {
            self.postMessage({ type: 'error', message: 'Fehler bei der BPM-Erkennung: ' + error.message });
        }

    } else if (type === 'encodeAudio') {
        try {
          const mp3Blob = encodeAudioToMp3(data.audioBuffer, data.bitRate);
          self.postMessage({ type: 'mp3Blob', mp3Blob }); //Korrekter Typ
        } catch (error) {
          self.postMessage({ type: 'error', message: 'Fehler beim Encodieren zu MP3: ' + error.message });
        }
    } else if (type === 'audioBufferToBlob') {
        try {
            const blob = await audioBufferToBlob(data.audioBuffer, data.audioType);
            self.postMessage({ type: 'blobData', blob }); // Korrekter Typ: blobData
        } catch (error) {
            self.postMessage({ type: 'error', message: 'Fehler beim Erstellen des Blobs: ' + error.message });
        }
    }
};

// --- Funktionsdefinitionen (innerhalb des Workers) ---

async function detectKey(audioBuffer) {
    // 1. Downsampling (optional, aber gut für Performance)
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length / 4, audioBuffer.sampleRate / 4);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    const downsampledBuffer = await offlineContext.startRendering();

     // 2. Chromagramm berechnen (mit Tonal.js)
    const chromagram = Tonal.Chroma.chroma(downsampledBuffer.getChannelData(0)); // Wir nehmen Kanal 0 an

    // 3. Tonart erkennen (mit Tonal.js)
    const key = Tonal.Key.detect(chromagram);
      if(!key[0]){ //Überprüfen ob etwas erkannt wurde
        return null // Wenn nicht Key zurückgeben
      } else {
        return key[0]; // gib das erste Resultat zurück.
      }
}

async function detectBPM(audioBuffer) {
    const offlineContext = new OfflineAudioContext(1, audioBuffer.length, audioBuffer.sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineContext.destination);
    source.start();
    const renderedBuffer = await offlineContext.startRendering(); //Audiobuffer wird gerendert

    if (typeof Meyda === 'undefined') { // Fehlerbehandlung, falls Meyda nicht geladen wurde
        console.error('Meyda is not loaded!');
        return null; // Oder einen Standardwert
    }

    // Extrahiere die nötigen Features
    const features = Meyda.extract(['amplitudeSpectrum', 'spectralCentroid'], renderedBuffer.getChannelData(0));

     // Berechnung der BPM (Sehr vereinfacht, dient nur als Beispiel)
    const bpmEstimates = [];
    for (let i = 1; i < features.amplitudeSpectrum.length; i++) {
        const diff = features.amplitudeSpectrum[i] - features.amplitudeSpectrum[i - 1]; //Differenz
         if (diff > 0.1) { // Sehr grober Schwellenwert!
            bpmEstimates.push(i);
        }
    }

    let bpm = 0; //Initialwert
    if (bpmEstimates.length > 1) {
        const intervals = [];
        for (let i = 1; i < bpmEstimates.length; i++) {
            intervals.push(bpmEstimates[i] - bpmEstimates[i - 1]);
        }

        // Durchschnittliches Intervall berechnen
        const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length; //Durchschnitt

        // BPM berechnen
          bpm = 60 / (averageInterval * (renderedBuffer.length / renderedBuffer.sampleRate) / features.amplitudeSpectrum.length );
    }

    return bpm; // Rückgabe
}

//Audio zu mp3 encoden
function encodeAudioToMp3(audioBuffer, bitRate) {
    const mp3Encoder = new lamejs.Mp3Encoder(audioBuffer.    const mp3Encoder = new lamejs.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, bitRate);
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null; //Wenn mehr als ein Kanal vorhanden ist, dann nehme auch den rechten Kanal
    const samples = new Float32Array(left.length + (right ? right.length : 0)); //Erstelle Array in passender Länge

    // Interleave-Format für Stereo (LRLRLR)
    let offset = 0;
    for (let i = 0; i < left.length; i++) {
        samples[offset++] = left[i] * 0x7FFF; // Skalieren auf 16-Bit-Integer (-32768 bis 32767)
        if (right) {
            samples[offset++] = right[i] * 0x7FFF;
        }
    }

    const mp3Data = [];
    let mp3buf = mp3Encoder.encodeBuffer(samples); //Samples encoden
     if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }
    mp3buf = mp3Encoder.flush(); //Verbleibende Daten encoden
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }


    return new Blob(mp3Data, { type: 'audio/mp3' }); //Blob erstellen
}

//Audiobuffer zu Blob konvertieren
async function audioBufferToBlob(audioBuffer, audioType) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  // Erstelle einen neuen OfflineAudioContext
  const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);

  const bufferSource = offlineContext.createBufferSource(); //Quelle erstellen
    bufferSource.buffer = audioBuffer;

  // Verbinde den BufferSourceNode mit dem Ziel des OfflineAudioContext
    bufferSource.connect(offlineContext.destination);
    bufferSource.start();

    // Rendere den OfflineAudioContext
    return offlineContext.startRendering() //Gibt Promise zurück
    .then(renderedBuffer => { //Wenn das Rendern abgeschlossen ist
      // Hier den WAV-Blob erstellen (oder jeden anderen Codec/Container)
      const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length); //Verwende die Hilfsfunktion
      return wavBlob;

    });
}

//Hilfsfunktion um Audiobuffer zu wav zu konvertieren
function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44; //44 Header
    const buffer = new ArrayBuffer(length); //Neuer Buffer
    const view = new DataView(buffer); //DataView für binäre Daten
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // Schreibe den WAV-Header (Details siehe: http://soundfile.sapp.org/doc/WaveFormat/)
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // Dateigröße - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " Chunk
    setUint32(16); // Größe des fmt-Chunks
    setUint16(1); // PCM-Format (1 = unkomprimiert)
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan); // Byte-Rate
    setUint16(numOfChan * 2); // Block-Align
    setUint16(16); // Bits pro Sample

    setUint32(0x61746164); // "data" Chunk
    setUint32(length - pos - 4); // Datenbereichsgröße

    // Schreibe die Audiodaten
    for (i = 0; i < abuffer.numberOfChannels; i++) {
        channels.push(abuffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            // Interleave-Daten ( உதார: L-R-L-R...)
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // Clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // Skalierung
            view.setInt16(pos, sample, true); // Schreibe in Little-Endian
            pos += 2;
        }
        offset++; // Nächster Frame
    }

    return new Blob([view], { type: 'audio/wav' });

    function setUint16(data) {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    function setUint32(data) {
        view.setUint32(pos, data, true);
        pos += 4;
    }
}






