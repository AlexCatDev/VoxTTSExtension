chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetchAudio') {
    fetchAudio(message.text, message.speaker, message.speedScale, message.pitch, message.intonationScale, message.host).then(audioBlob => {
        console.log('Audio blob fetched successfully:', audioBlob);
        sendResponse({ success: true, blob: audioBlob });
    }).catch(error => {
        console.error('Error:', error);
        sendResponse({ success: false, error: error.message });
    });
  }

      // IMPORTANT: Keep the message channel open for async response
          return true;
});

async function blobToBase64(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return "data:audio/wav;base64," + btoa(binary);
}


const fetchAudio = async (text, speaker, speedScale, pitchScale, intonationScale, host) => {
  try {
    // Step 1: Send a GET request to get the audio query
    const audioQueryUrl = `${host}/audio_query?text=${encodeURIComponent(text)}&speaker=${speaker}`;
    const audioQueryResponse = await fetch(audioQueryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!audioQueryResponse.ok) {
      throw new Error(`Failed to fetch audio query: ${audioQueryUrl}`);
    }

    const audioQueryData = await audioQueryResponse.json(); // Assuming the response is JSON

    audioQueryData.speedScale = speedScale;
    audioQueryData.pitchScale = pitchScale;
    audioQueryData.intonationScale = intonationScale;

    console.log('Response received', audioQueryData);

    // Step 2: Send a POST request to generate the audio (synthesis)
    const synthesisUrl = `${host}/synthesis?speaker=${speaker}&enable_interrogative_upspeak=true`;
    const synthesisResponse = await fetch(synthesisUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(audioQueryData) // Pass the audio query data to the synthesis endpoint
    });

    if (!synthesisResponse.ok) {
      throw new Error('Failed to fetch audio synthesis');
    }

    // Step 3: Get the audio (typically a .wav file) as a Blob
    const audioBlob = await synthesisResponse.blob();
    const base64 = await blobToBase64(audioBlob);

    // Return the audio blob (you can now play it or process it further)
    return base64;

  } catch (error) {
    console.error('Error fetching audio:', error);
    throw error; // Propagate error
  }
};
