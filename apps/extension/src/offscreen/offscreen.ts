// Offscreen document for audio recording
// Manifest V3 requires an offscreen document to use MediaRecorder

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let currentStream: MediaStream | null = null;

async function startAudioRecording(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    currentStream = stream;

    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
        console.log('[Offscreen] Audio chunk received, size:', event.data.size);
      }
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

async function stopAudioRecording(): Promise<void> {
  return new Promise((resolve) => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      console.log('[Offscreen] No active recording to stop');
      resolve();
      return;
    }

    mediaRecorder.onstop = async () => {
      console.log('[Offscreen] MediaRecorder stopped, chunks:', audioChunks.length);

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      console.log('[Offscreen] Audio blob size:', audioBlob.size);

      if (audioBlob.size > 0) {
        // Convert to base64 and send to service worker
        const reader = new FileReader();
        reader.onloadend = async () => {
          console.log('[Offscreen] Sending audio data to service worker');
          // Await sendMessage to ensure it's delivered before resolving
          try {
            await chrome.runtime.sendMessage({
              type: 'AUDIO_RECORDED',
              data: reader.result,
            });
            console.log('[Offscreen] Audio data sent successfully');
          } catch (error) {
            console.error('[Offscreen] Failed to send audio data:', error);
          }
          // Stop all tracks after sending data
          if (currentStream) {
            currentStream.getTracks().forEach((track) => track.stop());
          }
          resolve();
        };
        reader.onerror = () => {
          console.error('[Offscreen] FileReader error');
          if (currentStream) {
            currentStream.getTracks().forEach((track) => track.stop());
          }
          resolve();
        };
        reader.readAsDataURL(audioBlob);
      } else {
        console.warn('[Offscreen] Audio blob is empty, no data to send');
        if (currentStream) {
          currentStream.getTracks().forEach((track) => track.stop());
        }
        resolve();
      }
    };

    mediaRecorder.stop();
    console.log('[Offscreen] Audio recording stop requested');
  });
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'START_AUDIO':
      startAudioRecording().then((success) => sendResponse({ success }));
      return true;

    case 'STOP_AUDIO':
      stopAudioRecording().then(() => {
        console.log('[Offscreen] Stop audio complete, sending response');
        sendResponse({ success: true });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
      return true;
  }
});

console.log('[Offscreen] Document ready');
