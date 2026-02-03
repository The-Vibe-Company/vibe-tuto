// Popup state management

type PopupState = 'not-connected' | 'idle' | 'recording' | 'uploading' | 'success' | 'error';

const APP_URL = 'http://localhost:3000';

interface UploadResult {
  tutorialId: string;
  status: string;
  editorUrl: string;
}

let timerInterval: ReturnType<typeof setInterval> | null = null;

// Store pending upload data for retry functionality
interface PendingUpload {
  steps: Array<{
    timestamp: number;
    type: 'click' | 'navigation';
    screenshot?: string;
    x?: number;
    y?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    url: string;
  }>;
  audioData: string | null;
}
let pendingUpload: PendingUpload | null = null;

function showState(state: PopupState): void {
  const states: PopupState[] = ['not-connected', 'idle', 'recording', 'uploading', 'success', 'error'];

  states.forEach((s) => {
    const element = document.getElementById(s);
    if (element) {
      element.classList.toggle('hidden', s !== state);
    }
  });
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateTimer(startTime: number): void {
  const timerElement = document.getElementById('timer');
  if (timerElement) {
    const elapsed = Date.now() - startTime;
    timerElement.textContent = formatTime(elapsed);
  }
}

function startTimer(startTime: number): void {
  stopTimer();
  updateTimer(startTime);
  timerInterval = setInterval(() => updateTimer(startTime), 1000);
}

function stopTimer(): void {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function showUserEmail(email: string | null): void {
  const emailElement = document.getElementById('user-email');
  if (emailElement) {
    if (email) {
      emailElement.textContent = email;
      emailElement.classList.remove('hidden');
    } else {
      emailElement.classList.add('hidden');
    }
  }
}

async function checkAuth(): Promise<{ isAuthenticated: boolean; email?: string }> {
  const result = await chrome.storage.local.get(['authToken', 'userEmail']);
  return {
    isAuthenticated: !!result.authToken,
    email: result.userEmail,
  };
}

async function getCurrentState(): Promise<{
  state: PopupState;
  email?: string;
  recordingStartTime?: number;
}> {
  const auth = await checkAuth();
  if (!auth.isAuthenticated) {
    return { state: 'not-connected' };
  }

  const result = await chrome.storage.local.get(['isRecording', 'recordingStartTime']);
  if (result.isRecording && result.recordingStartTime) {
    return {
      state: 'recording',
      email: auth.email,
      recordingStartTime: result.recordingStartTime,
    };
  }

  return { state: 'idle', email: auth.email };
}

async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return result.state;
  } catch (error) {
    // If permissions API fails, assume we need to prompt
    console.log('[Popup] Permissions API not available:', error);
    return 'prompt';
  }
}

async function requestMicrophonePermissionViaIframe(): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || tab.url.startsWith('chrome://')) {
    console.log('[Popup] Cannot request permission on this tab');
    return false;
  }

  return new Promise((resolve) => {
    // Add listener BEFORE sending message to avoid race condition
    const listener = (msg: { type: string; error?: string }): void => {
      if (msg.type === 'MICROPHONE_PERMISSION_GRANTED') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(true);
      } else if (msg.type === 'MICROPHONE_PERMISSION_DENIED') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(false);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    // Send message to content script to inject iframe
    chrome.tabs.sendMessage(tab.id!, { type: 'REQUEST_MICROPHONE_PERMISSION' }).catch((error) => {
      console.log('[Popup] Failed to send message to content script:', error);
      chrome.runtime.onMessage.removeListener(listener);
      resolve(false);
    });

    // Timeout after 60s (user might take time to click allow)
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      resolve(false);
    }, 60000);
  });
}

async function startRecording(): Promise<void> {
  try {
    // Check microphone permission status
    const permissionState = await checkMicrophonePermission();
    console.log('[Popup] Microphone permission state:', permissionState);

    if (permissionState === 'denied') {
      showError('Permission micro refusée. Allez dans les paramètres Chrome pour l\'autoriser.');
      showState('error');
      return;
    }

    if (permissionState === 'prompt') {
      // Request permission via iframe in content script
      console.log('[Popup] Requesting permission via iframe...');
      const granted = await requestMicrophonePermissionViaIframe();
      if (!granted) {
        showError('Permission micro refusée ou timeout.');
        showState('error');
        return;
      }
      console.log('[Popup] Permission granted via iframe');
    }

    // Permission granted - start recording
    const startTime = Date.now();
    await chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    await chrome.storage.local.set({
      isRecording: true,
      recordingStartTime: startTime,
    });
    showState('recording');
    startTimer(startTime);
  } catch (error) {
    console.error('Failed to start recording:', error);
  }
}

async function uploadRecording(
  steps: Array<{
    timestamp: number;
    type: 'click' | 'navigation';
    screenshot?: string;
    x?: number;
    y?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    url: string;
  }>,
  audioData: string | null
): Promise<UploadResult> {
  const { authToken } = await chrome.storage.local.get(['authToken']);

  if (!authToken) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();

  // Add audio if available
  if (audioData) {
    // Convert base64 to blob
    const audioBlob = base64ToBlob(audioData, 'audio/webm');
    formData.append('audio', audioBlob, 'recording.webm');
  }

  // Add metadata
  const metadata = {
    title: `Tutoriel du ${new Date().toLocaleDateString('fr-FR')}`,
    duration: steps.length > 0 ? steps[steps.length - 1].timestamp : 0,
    startedAt: new Date().toISOString(),
    steps: steps.map((step, index) => ({
      timestamp: step.timestamp,
      type: step.type,
      screenshot: step.screenshot || '',
      x: step.x,
      y: step.y,
      viewportWidth: step.viewportWidth,
      viewportHeight: step.viewportHeight,
      url: step.url,
    })),
  };

  formData.append('metadata', JSON.stringify(metadata));

  const response = await fetch(`${APP_URL}/api/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[Popup] Upload error details:', error);
    throw new Error(error.details || error.error || 'Upload failed');
  }

  return response.json();
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  // Handle data URL format
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

function showSuccessLink(editorUrl: string): void {
  const linkElement = document.getElementById('editor-link') as HTMLAnchorElement;
  if (linkElement) {
    linkElement.href = `${APP_URL}${editorUrl}`;
    linkElement.onclick = (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: `${APP_URL}${editorUrl}` });
    };
  }
}

function showError(message: string): void {
  const errorElement = document.getElementById('error-message');
  if (errorElement) {
    errorElement.textContent = message;
  }
}

async function stopRecording(): Promise<void> {
  try {
    stopTimer();
    showState('uploading');

    console.log('[Popup] Sending STOP_RECORDING...');
    // Send message to stop recording - don't rely on sendResponse for data
    await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });

    // Wait for the service worker to process and store result
    // Service worker waits 500ms for audio processing, so we wait a bit longer
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Get recording result from storage (more reliable than sendResponse for large data)
    const { recordingResult } = await chrome.storage.local.get(['recordingResult']);
    console.log('[Popup] Recording result from storage:', recordingResult);
    console.log('[Popup] Steps length:', recordingResult?.steps?.length);

    // Clean up storage
    await chrome.storage.local.set({
      isRecording: false,
      recordingStartTime: null,
      recordingResult: null,
    });

    if (!recordingResult || !recordingResult.success || !recordingResult.steps || recordingResult.steps.length === 0) {
      console.log('[Popup] No steps - showing error');
      showError('Aucune étape capturée');
      showState('error');
      return;
    }

    // Store for potential retry
    pendingUpload = {
      steps: recordingResult.steps,
      audioData: recordingResult.audioData,
    };

    // Upload to API
    const result = await uploadRecording(recordingResult.steps, recordingResult.audioData);

    // Clear pending upload on success
    pendingUpload = null;
    showSuccessLink(result.editorUrl);
    showState('success');
  } catch (error) {
    console.error('Failed to stop recording:', error);
    showError(error instanceof Error ? error.message : 'Une erreur est survenue');
    showState('error');
    // Keep pendingUpload for retry
  }
}

async function retryUpload(): Promise<void> {
  if (!pendingUpload) {
    showError('Aucune donnée à réessayer');
    showState('error');
    return;
  }

  try {
    showState('uploading');
    const result = await uploadRecording(pendingUpload.steps, pendingUpload.audioData);

    // Clear pending upload on success
    pendingUpload = null;
    showSuccessLink(result.editorUrl);
    showState('success');
  } catch (error) {
    console.error('Failed to retry upload:', error);
    showError(error instanceof Error ? error.message : 'Une erreur est survenue');
    showState('error');
  }
}

function openDashboard(): void {
  chrome.tabs.create({ url: `${APP_URL}/dashboard` });
}

function openLogin(): void {
  chrome.tabs.create({ url: `${APP_URL}/login` });
}

function backToIdle(): void {
  showState('idle');
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const { state, email, recordingStartTime } = await getCurrentState();

  showState(state);
  showUserEmail(email || null);

  // If recording, start the timer from the saved start time
  if (state === 'recording' && recordingStartTime) {
    startTimer(recordingStartTime);
  }

  // Event listeners
  document.getElementById('login-btn')?.addEventListener('click', openLogin);
  document.getElementById('start-btn')?.addEventListener('click', startRecording);
  document.getElementById('stop-btn')?.addEventListener('click', stopRecording);
  document.getElementById('dashboard-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openDashboard();
  });
  document.getElementById('new-recording-btn')?.addEventListener('click', () => {
    pendingUpload = null; // Clear pending data when starting fresh
    backToIdle();
  });
  document.getElementById('retry-btn')?.addEventListener('click', retryUpload);
});

// Clean up timer when popup closes
window.addEventListener('unload', () => {
  stopTimer();
});
