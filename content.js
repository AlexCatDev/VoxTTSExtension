let playing = false;

let readButton, popup;

let pauseButton;
let clipCounter;
let progressBar;

let playIndex = 0;
function togglePlaying()
{
    //If audio clips are 0 for some reason due to it failing to fetch em do something in the future
    if(audioClips.length === 0) return;

    playing = !playing;

    if(playing === true) {
        pauseButton.textContent = "⏸";

        //Nudge the playback a little bit for a better experience
        const playbackNudge = 0.7;
        audioClips[playIndex]
        audioClips[playIndex].currentTime = Math.max(audioClips[playIndex].currentTime - playbackNudge, 0);

        audioClips[playIndex].play();

    } else {
        pauseButton.textContent = "►";

        audioClips[playIndex].pause();
    }
}

function forwards() {
    if(audioClips.length === 0) return;

    //Ideally i'd do something similar to the backwards function but measuring the surplus of time and being smart about it.. but i never use this function anyways i dont care
     audioClips[playIndex].currentTime += 5;
}

function backwards() {
    if(audioClips.length === 0) return;

    let debt = audioClips[playIndex].currentTime - 5;

    if(debt < 0) {

        if(playIndex > 0) {
            audioClips[playIndex].pause();
            audioClips[playIndex].currentTime = 0;

            // (Debt is negative value of the overflow from the previous track)
            playIndex--;
            //If the debt still overflows the previous audio clip duration somehow just make it start from 0 and dont bother anymore
            audioClips[playIndex].currentTime = Math.max(audioClips[playIndex].duration + debt, 0);
            audioClips[playIndex].play();

        } else {
            //If we're at index 0 and theres overflow, just reset clip to beginning.;
            audioClips[playIndex].currentTime = 0;
        }

    } else {
        //No debt, just minus 5 seconds..
        audioClips[playIndex].currentTime -= 5;
    }

}

function convertSeconds(seconds) {
    let minutes = Math.floor(seconds / 60);          // Get full minutes
    let remainingSeconds = Math.floor(seconds % 60); // Get the whole number of seconds
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function getStorageAsync(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);  // Reject if there's an error
      } else {
        resolve(result);  // Resolve with the result if no error
      }
    });
    });
}

// Function to ensure the host URL is in the correct format
function formatHostUrl(host) {
  // Ensure the URL starts with 'https://'
  if (!/^http?:\/\//i.test(host)) {
    host = 'http://' + host;  // Default to 'https://' if no protocol is present
  }

  // Remove trailing slash if it exists
  host = host.replace(/\/$/, '');

  return host;
}

let audioClips = [];
let totalAudioLength = 0;
let totalChars = 0;

// Default values
const defaultSettings = {
  host: '127.0.0.1:50021',
  speaker: 1,
  speed: 1.0,
  pitch: 0.0,
  intonation: 1.0
};

async function readAloudActivate() {
    const selectedText = SELECTED_TEXT.toString();

    const cleanText = selectedText.replace(/\n/g, '');
    const sentences = cleanText.match(/(?:「.*?」|[^。]+。|[^。]+$)/g) || [];

    console.log(sentences);

    //Pause if playing
    if(playing) {
        togglePlaying();
    }

    totalChars = 0;
    playIndex = 0;
    audioClips.length = 0;
    totalAudioLength = 0;

    const result = await getStorageAsync(['host', 'speaker', 'speed', 'pitch', 'intonation']);

    const settings = {
      host: formatHostUrl(result.host || defaultSettings.host),

      speaker: (result.speaker === 0 || result.speaker === undefined) ? defaultSettings.speaker : result.speaker,

      speed: result.speed || defaultSettings.speed,
      pitch: result.pitch || defaultSettings.pitch,
      intonation: result.intonation || defaultSettings.intonation
    };

    console.log(settings)

    for (const sentence of sentences) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'fetchAudio', text: sentence, speaker: settings.speaker, speedScale: settings.speed, pitch: settings.pitch, intonationScale: settings.intonation, host: settings.host },
          (response) => {
            if (response.success) {
              resolve(response); // Resolve with the response when successful
            } else {
              reject(response.error || 'Unknown error');
            }
          }
        );
      });

      //Add the sentence to the total chars and remove useless stuff
      totalChars += sentence.replace(/　|。| |、|「|」/g, '').length;

      //handle sucessful response
      const audio = new Audio(response.blob);
      audio.onloadedmetadata = () => {
        totalAudioLength += audio.duration;
      };

      audioClips.push(audio);

      if (audioClips.length === 1) {
        //first audio clip
        togglePlaying();
      }

    } catch (error) {
      console.error('Failed to fetch audio:', error.message);
    }
  }
}

function makeFinite(value) {
  if (Number.isFinite(value))
    return value;

  return 0;
}

function updateStats(addTime, addChars) {

    addTime = makeFinite(addTime);
    addChars = makeFinite(addChars);

    chrome.storage.local.get(['totalTime', 'totalChars'], (result) => {
                // Set default values if they don't exist yet
                let totalTime = result.totalTime || 0; // Default to 0 if undefined
                let totalChars = result.totalChars || 0; // Default to 0 if undefined

                // Add the new values
                totalTime += addTime;
                totalChars += addChars;

                // Save the updated values back to chrome.storage.local
                chrome.storage.local.set({
                    totalTime: totalTime,
                    totalChars: totalChars
                    }, () => {
                        console.log(`Updated stats [Time: ${totalTime} Chars: ${totalChars}]`);
                    });

                timeToSave = 0;
                charsToSave = 0;
                });
}

function closePopup() {
    popup.style.display = 'none';

    if(playing)
        togglePlaying();
}

// Create the Play button
function createReadButton() {
    readButton = document.createElement('button');
    readButton.textContent = 'Read Aloud';
    readButton.id = '本語read-button';
    document.body.appendChild(readButton);

    readButton.addEventListener('click', (e) => {
        readButton.style.display = 'none';

        popup.style.display = 'flex';

        popup.style.top = `${e.clientY}px`;
        popup.style.left = `${e.clientX}px`;

        readAloudActivate();
    });
}

function createPopup() {
    popup = document.createElement('div');
    popup.id = '本語popup';
    popup.innerHTML = `
        <div id="本語clip-counter">0/100</div>
        <button id="本語prev">⏮</button>
        <button id="本語pause">⏸</button>
        <button id="本語next">⏭</button>
        <button id="本語close">✕</button>

        <div id="本語progress-bar"></div>
    `;
    document.body.appendChild(popup);

    makeDraggable(popup);

    document.getElementById('本語close').addEventListener('click', () => closePopup());

    // Example actions for other buttons
    document.getElementById('本語prev').addEventListener('click', () => backwards());

    pauseButton = document.getElementById('本語pause');
    pauseButton.addEventListener('click', () => togglePlaying());

    document.getElementById('本語next').addEventListener('click', () => forwards());

    clipCounter = document.getElementById('本語clip-counter');

    progressBar = document.getElementById('本語progress-bar');

        // Simulate progress
        let progress = 0.5;

        let lastPlayed = 0;
        let lastChars = 0;

        let autoSaveTime = 0;

        const updateProgress = () => {

            if(audioClips.length === 0)
                return;

            autoSaveTime += 0.1;

            let durationPlayed = 0;
            for(let i = 0; i < playIndex; i++)
            {
                durationPlayed += audioClips[i].duration;
            }

            let currentClip = audioClips[playIndex];
            durationPlayed += currentClip.currentTime;

            progress = durationPlayed / totalAudioLength;

            if(playing) {
                if (currentClip.currentTime >= currentClip.duration) {
                    // Do something when the audio finishes

                    //99 // 100 == same
                    if(playIndex < audioClips.length - 1) {
                        playIndex++;
                        audioClips[playIndex].play();
                    }
                }
            }

            // Dynamically update the width of the progress bar
            progressBar.style.width = `${Math.ceil(progress*100)}%`;

            let charProgress = Math.floor(totalChars*progress);

            clipCounter.textContent = `${convertSeconds(durationPlayed)} -> ${charProgress} :: ${playIndex + 1}/${audioClips.length} | ${convertSeconds(totalAudioLength)} | ${totalChars}`

            let diffPlayed = durationPlayed - lastPlayed;
            let diffChars = charProgress - lastChars;

            //We seeked backwards reset stats
            if(diffPlayed < 0 || diffPlayed >= 3) {
                lastPlayed = durationPlayed;
                lastChars = charProgress;
                console.log(`Discarding stats. was negative or too big`)
            } else if (autoSaveTime >= 1.5) {
              autoSaveTime = 0;

              updateStats(diffPlayed, diffChars);

              lastChars = charProgress;
              lastPlayed = durationPlayed;
            }
        };

        // Update progress every 100ms
        setInterval(updateProgress, 100);
}

// Make an element draggable
function makeDraggable(element) {
    let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        let popup = element;

    // Mouse and touch start
        const startDrag = (e) => {
            isDragging = true;

            // Get the initial click/touch position relative to the popup
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            offsetX = clientX - popup.getBoundingClientRect().left;
            offsetY = clientY - popup.getBoundingClientRect().top;

            if(e.touches) {
                document.addEventListener('touchmove', onDrag, { passive: false });
                document.addEventListener('touchend', stopDrag);
            } else {
                document.addEventListener('mousemove', onDrag);
                document.addEventListener('mouseup', stopDrag);
            }
        };

        // Dragging the popup
        const onDrag = (e) => {
            if (!isDragging) return;

            // Get current position
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Update popup position
            popup.style.left = `${clientX - offsetX}px`;
            popup.style.top = `${clientY - offsetY}px`;
            popup.style.transform = `none`; // Reset transform for precise dragging

            if(e.touches) {
                e.preventDefault();
            }
        };

        // Stop dragging
        const stopDrag = (e) => {
            isDragging = false;

            document.removeEventListener(e.touches ? 'touchmove' : 'mousemove', onDrag);
            document.removeEventListener(e.touches ? 'touchend' : 'mouseup', stopDrag);
        };

        // Attach dragging functionality to the popup (desktop + mobile)
        popup.addEventListener('mousedown', startDrag);
        popup.addEventListener('touchstart', startDrag);
}


let mouseX = 0;
let lastMouseX = 0;

let mouseY = 0;
let lastMouseY = 0;
document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    let diffX = mouseX - lastMouseX;
    let diffY = mouseY - lastMouseY;

    lastMouseX = mouseX;
    lastMouseY = mouseY;
});

document.addEventListener('touchmove', (e) => {
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;

    let diffX = mouseX - lastMouseX;
    let diffY = mouseY - lastMouseY;

    lastMouseX = mouseX;
    lastMouseY = mouseY;
});

let SELECTED_TEXT = '';

document.addEventListener('selectionchange', () => {
    const selection = window.getSelection().toString();

    if (selection && selection.length > 0) {
        SELECTED_TEXT = window.getSelection();

        readButton.style.display = 'block';
        readButton.style.top = `${window.scrollY + 100}px`;
        readButton.style.left = `${window.scrollX}px`;
    } else {
        readButton.style.display = 'none';
    }
});

// Initialize Play button
createReadButton();
createPopup();

