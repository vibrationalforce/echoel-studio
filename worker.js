// worker.js

// Hinweis: Libraries, die im Worker verwendet werden sollen, müssen *innerhalb* des Workers importiert werden.
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
  } else if (type === 'encodeAudio') { //hinzugefügt für den Export von mp3
    try{
      const mp3Blob = encodeAudioToMp3(data.audioBuffer, data.bitRate);
      self.postMessage({type: 'mp3Blob', mp3Blob});
    } catch (error){
      self.postMessage({ type: 'error', message: 'Fehler beim Encodieren zu MP3: ' + error.message });
    }
  }else if(type === 'audioBufferToBlob'){
    try {
          const blob = await audioBufferToBlob(data.audioBuffer, data.audioType);
          self.postMessage({ type: 'blobData', blob });
        } catch (error) {
            self.postMessage({ type: 'error', message: 'Fehler beim Erstellen des Blobs: ' + error.message });
        }
  }
};

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
      if(!key[0]){
        return null
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
  const renderedBuffer = await offlineContext.startRendering();


    if (typeof Meyda === 'undefined') {
        console.error('Meyda is not loaded!');
        return null; // Oder einen Standardwert
    }

    // Extrahiere die nötigen Features
    const features = Meyda.extract(['amplitudeSpectrum', 'spectralCentroid'], renderedBuffer.getChannelData(0));

     // Berechnung der BPM.  Diese Logik ist *sehr* vereinfacht und dient nur als Beispiel.
    // Eine robuste BPM-Erkennung ist ein komplexes Thema!
    const bpmEstimates = [];
    for (let i = 1; i < features.amplitudeSpectrum.length; i++) {
        const diff = features.amplitudeSpectrum[i] - features.amplitudeSpectrum[i - 1];
         if (diff > 0.1) { // Sehr grober Schwellenwert für Onset!  Anpassen!
            bpmEstimates.push(i);
        }
    }

    let bpm = 0;
    if (bpmEstimates.length > 1) {
        const intervals = [];
        for (let i = 1; i < bpmEstimates.length; i++) {
            intervals.push(bpmEstimates[i] - bpmEstimates[i - 1]);
        }

        // Durchschnittliches Intervall berechnen
        const averageInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;

        // BPM berechnen (Formel anpassen, je nach Samplingrate und Frame-Größe von Meyda)
          bpm = 60 / (averageInterval * (renderedBuffer.length / renderedBuffer.sampleRate) / features.amplitudeSpectrum.length );
    }

    return bpm; // Gib den berechneten BPM-Wert zurück
}

//Audio zu mp3 encoden
function encodeAudioToMp3(audioBuffer, bitRate) {
    const mp3Encoder = new lamejs.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, bitRate);
    const left = audioBuffer.getChannelData(0);
    const right = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
    const samples = new Float32Array(left.length + (right ? right.length : 0));

    // Interleave-Format für Stereo
    let offset = 0;
    for (let i = 0; i < left.length; i++) {
        samples[offset++] = left[i] * 0x7FFF; // Skalieren auf 16-Bit-Integer
        if (right) {
            samples[offset++] = right[i] * 0x7FFF;
        }
    }

    const mp3Data = [];
    let mp3buf = mp3Encoder.encodeBuffer(samples);
     if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }
    mp3buf = mp3Encoder.flush();
    if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
    }


    return new Blob(mp3Data, { type: 'audio/mp3' });
}
//Audiobuffer zu Blob konvertieren
async function audioBufferToBlob(audioBuffer, audioType) {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const length = audioBuffer.length;

  // Erstelle einen neuen OfflineAudioContext
  const offlineContext = new OfflineAudioContext(numberOfChannels, length, sampleRate);

  const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;

  // Verbinde den BufferSourceNode mit dem Ziel des OfflineAudioContext
    bufferSource.connect(offlineContext.destination);
    bufferSource.start();

    // Rendere den OfflineAudioContext
    return offlineContext.startRendering()
    .then(renderedBuffer => {
      // Hier den WAV-Blob erstellen (oder jeden anderen Codec, den du verwenden möchtest)
      const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length); //Verwende die Hilfsfunktion
      return wavBlob;

    });
}


//Hilfsfunktion um Audiobuffer zu wav zu konvertieren
function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    // Schreibe den WAV-Header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // Dateigröße - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " Chunk
    setUint32(16); // Größe des fmt-Chunks
    setUint16(1); // PCM-Format
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
            // Interleave-Daten
            sample = Math.max(-1, Math.min(1, channels[i][offset])); // Clamp
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // Skalierung + Runden
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

