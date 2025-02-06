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

    const arrayBuffer = await audioBlob.arrayBuffer();
    //This is a view into the arrayBuffer
    const bytes = new Uint8Array(arrayBuffer);

    //This api is stupid so we need to convert it to text before we can send it back.. wasting resources

    let binaryText = '';
    bytes.forEach(b => binaryText += String.fromCharCode(b));

    return binaryText;

  } catch (error) {
    console.error('Error fetching audio:', error);
    throw error; // Propagate error
  }
};
