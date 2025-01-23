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
        const playbackNudge = 0.1;
        audioClips[playIndex].currentTime -= playbackNudge;

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

let audioClips = [];
let totalAudioLength = 0;
let totalChars = 0;

//67 中世

//1 ずんだもん

//47 whisperish cute easy on the ears, my favorite

//13 best voice by far imo
let speaker = 13;

//Speed
let speed = 0.9;
//This is useless
let pitch = 0.0;
//Pitch accent scale
let intonationScale = 1.0;

async function readAloudActivate() {
    const selectedText = SELECTED_TEXT.toString();

    const cleanText = selectedText.replace(/\n/g, '');
    const sentences = cleanText.match(/(?:「.*?」|[^。]+。|[^。]+$)/g) || [];

    console.log(sentences);

    if(playing) {
        togglePlaying();
    }

    totalChars = 0;
    playIndex = 0;
    audioClips.length = 0;
    totalAudioLength = 0;

    for (const sentence of sentences) {
    try {
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: 'fetchAudio', text: sentence, speaker: speaker, speedScale: speed, pitch: pitch, intonationScale: intonationScale },
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
      console.error('Failed to fetch audio:', error);
    }
  }
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
        const updateProgress = () => {

            if(audioClips.length === 0)
                return;

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

            clipCounter.textContent = `${convertSeconds(durationPlayed)} -> ${Math.floor(totalChars*progress)} :: ${playIndex + 1}/${audioClips.length} | ${convertSeconds(totalAudioLength)} | ${totalChars}`
        };

        // Update progress every 100ms (simulate progress animation)
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
        readButton.style.top = `${mouseY + window.scrollY}px`;
        readButton.style.left = `${mouseX + window.scrollX + 50}px`;
    } else {
        readButton.style.display = 'none';
    }
});


// Detect text selection and position Play button
function showReadButton(event) {
    const selection = window.getSelection().toString().trim();

    if (selection && selection.length > 0) {
        readButton.style.display = 'block';
        readButton.style.top = `${event.clientY + window.scrollY}px`;
        readButton.style.left = `${event.clientX + window.scrollX}px`;
    }
}

// Listen for selection events
//document.addEventListener('mouseup', (e) => showReadButton(e));
//document.addEventListener('touchend', (e) => showReadButton(e));

// Initialize Play button
createReadButton();
createPopup();

/*
let popupScale = 1;
// Adjust scale dynamically to counteract browser zoom
function adjustScale() {
   popupScale = 1 / window.devicePixelRatio; // Counteract zoom
   popup.style.transform = `scale(${popupScale})`;
}
window.addEventListener('resize', adjustScale);
adjustScale(); // Initial adjustment'
*/
