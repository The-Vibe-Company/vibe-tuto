// Offscreen document for audio recording
// Manifest V3 requires an offscreen document to use MediaRecorder

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

async function startAudioRecording(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

      // Convert to base64 and send to service worker
      const reader = new FileReader();
      reader.onloadend = () => {
        chrome.runtime.sendMessage({
          type: 'AUDIO_RECORDED',
          data: reader.result,
        });
      };
      reader.readAsDataURL(audioBlob);

      // Stop all tracks
      stream.getTracks().forEach((track) => track.stop());
    };

    mediaRecorder.start(1000); // Collect data every second
    console.log('[Offscreen] Audio recording started');
    return true;
  } catch (error) {
    console.error('[Offscreen] Failed to start audio recording:', error);
    chrome.runtime.sendMessage({
      type: 'AUDIO_ERROR',
      error: (error as Error).message,
    });
    return false;
  }
}

function stopAudioRecording(): void {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    console.log('[Offscreen] Audio recording stopped');
  }
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'START_AUDIO':
      startAudioRecording().then((success) => sendResponse({ success }));
      return true;

    case 'STOP_AUDIO':
      stopAudioRecording();
      sendResponse({ success: true });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
      return true;
  }
});

console.log('[Offscreen] Document ready');
