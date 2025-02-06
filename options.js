function convertSeconds(seconds) {
    let minutes = Math.floor(seconds / 60);          // Get full minutes
    let remainingSeconds = Math.floor(seconds % 60); // Get the whole number of seconds
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

 // Function to load saved settings from chrome.storage.local
    const loadSettings = () => {
      chrome.storage.local.get(['speed', 'pitch', 'intonation', 'host', 'speaker', 'speaker2', 'totalChars', 'totalTime'], (result) => {
        // Load saved slider values and apply them
        if (result.speed) {
          document.getElementById('speedSlider').value = result.speed;
          document.getElementById('speedValue').textContent = result.speed;
        }
        if (result.pitch) {
          document.getElementById('pitchSlider').value = result.pitch;
          document.getElementById('pitchValue').textContent = result.pitch;
        }
        if (result.intonation) {
          document.getElementById('intonationSlider').value = result.intonation;
          document.getElementById('intonationValue').textContent = result.intonation;
        }
        // Load saved host value and apply it
        if (result.host) {
          document.getElementById('hostTextbox').value = result.host;
        }

        if (result.speaker) {
          document.getElementById('speakerPicker').value = result.speaker;
        }

        if (result.speaker2) {
          document.getElementById('speakerPicker2').value = result.speaker2;
        }

        // Load total read and listened values
        if (result.totalChars !== undefined) {
          document.getElementById('totalCharsLabel').textContent = `Total Characters: ${(result.totalChars / 1000).toFixed(2)} Thousand`;
        }
        if (result.totalTime !== undefined) {
          document.getElementById('totalTimeLabel').textContent = `Total Time: ${convertSeconds(result.totalTime)}`;
        }
      });
    };

    // Function to save the slider values and total read/listened to chrome.storage.local
    const saveValues = () => {
      const speed = document.getElementById('speedSlider').value;
      const pitch = document.getElementById('pitchSlider').value;
      const intonation = document.getElementById('intonationSlider').value;
      const host = document.getElementById('hostTextbox').value;
      const speaker = document.getElementById('speakerPicker').value;
      const speaker2 = document.getElementById('speakerPicker2').value;

      // Save the values to chrome.storage.local
      chrome.storage.local.set({
        speed: speed,
        pitch: pitch,
        intonation: intonation,
        host: host,
        speaker: speaker,
        speaker2: speaker2
      }, () => {
        console.log('All values saved to chrome.storage.local');
      });
    };

    // Event listeners for sliders
    document.getElementById('speedSlider').addEventListener('input', () => {
      document.getElementById('speedValue').textContent = document.getElementById('speedSlider').value;
      saveValues();
    });

    document.getElementById('pitchSlider').addEventListener('input', () => {
      document.getElementById('pitchValue').textContent = document.getElementById('pitchSlider').value;
      saveValues();
    });

    document.getElementById('intonationSlider').addEventListener('input', () => {
      document.getElementById('intonationValue').textContent = document.getElementById('intonationSlider').value;
      saveValues();
    });

    // Host textbox event listener (default to localhost if empty)
    document.getElementById('hostTextbox').addEventListener('input', () => {
      saveValues();
    });

    document.getElementById('speakerPicker').addEventListener('input', () => {
      saveValues(); // Save the number picker value to local storage
    });

    document.getElementById('speakerPicker2').addEventListener('input', () => {
      saveValues(); // Save the number picker value to local storage
    });

    // Load settings on page load
    loadSettings();
