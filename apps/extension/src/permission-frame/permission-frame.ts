// Permission frame - Runs inside an iframe to request microphone permission
// This grants permission to the extension origin, which persists across all sites

async function requestPermission(): Promise<void> {
  console.log('[Permission Frame] Requesting microphone permission...');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just needed the permission
    stream.getTracks().forEach((track) => track.stop());

    console.log('[Permission Frame] Permission granted');
    window.parent.postMessage({ type: 'PERMISSION_GRANTED' }, '*');
  } catch (error) {
    console.error('[Permission Frame] Permission denied:', error);
    window.parent.postMessage(
      {
        type: 'PERMISSION_DENIED',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      '*'
    );
  }
}

requestPermission();
