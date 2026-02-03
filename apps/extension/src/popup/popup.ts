// Popup state management

type PopupState = 'not-connected' | 'idle' | 'recording';

const APP_URL = 'http://localhost:3000';

function showState(state: PopupState): void {
  const states: PopupState[] = ['not-connected', 'idle', 'recording'];

  states.forEach(s => {
    const element = document.getElementById(s);
    if (element) {
      element.classList.toggle('hidden', s !== state);
    }
  });
}

async function checkAuth(): Promise<boolean> {
  // TODO: Check if user is authenticated via storage
  const result = await chrome.storage.local.get(['authToken']);
  return !!result.authToken;
}

async function getCurrentState(): Promise<PopupState> {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    return 'not-connected';
  }

  const result = await chrome.storage.local.get(['isRecording']);
  return result.isRecording ? 'recording' : 'idle';
}

async function startRecording(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    await chrome.storage.local.set({ isRecording: true });
    showState('recording');
  } catch (error) {
    console.error('Failed to start recording:', error);
  }
}

async function stopRecording(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    await chrome.storage.local.set({ isRecording: false });
    showState('idle');
  } catch (error) {
    console.error('Failed to stop recording:', error);
  }
}

function openDashboard(): void {
  chrome.tabs.create({ url: `${APP_URL}/dashboard` });
}

function openLogin(): void {
  chrome.tabs.create({ url: `${APP_URL}/login` });
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  const state = await getCurrentState();
  showState(state);

  // Event listeners
  document.getElementById('login-btn')?.addEventListener('click', openLogin);
  document.getElementById('start-btn')?.addEventListener('click', startRecording);
  document.getElementById('stop-btn')?.addEventListener('click', stopRecording);
  document.getElementById('dashboard-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    openDashboard();
  });
});
