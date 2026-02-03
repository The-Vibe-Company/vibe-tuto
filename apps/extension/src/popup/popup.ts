// Popup state management

type PopupState = 'not-connected' | 'idle' | 'recording';

const APP_URL = 'http://localhost:3000';

let timerInterval: ReturnType<typeof setInterval> | null = null;

function showState(state: PopupState): void {
  const states: PopupState[] = ['not-connected', 'idle', 'recording'];

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

async function startRecording(): Promise<void> {
  try {
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

async function stopRecording(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    await chrome.storage.local.set({
      isRecording: false,
      recordingStartTime: null,
    });
    stopTimer();
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
});

// Clean up timer when popup closes
window.addEventListener('unload', () => {
  stopTimer();
});
