// Service Worker - Background script for Chrome Extension
// Handles communication between popup, content scripts, and offscreen documents

interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  steps: CapturedStep[];
  audioData: string | null;
}

interface CapturedStep {
  timestamp: number;
  type: 'click' | 'navigation';
  screenshot?: string;
  x?: number;
  y?: number;
  url: string;
  elementInfo?: {
    tag: string;
    text: string;
  };
}

const state: RecordingState = {
  isRecording: false,
  startTime: null,
  steps: [],
  audioData: null,
};

const OFFSCREEN_DOCUMENT_PATH = 'offscreen/offscreen.html';

// Check if offscreen document exists
async function hasOffscreenDocument(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)],
  });
  return contexts.length > 0;
}

// Create offscreen document for audio recording
async function setupOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Recording audio from microphone for tutorial creation',
  });

  console.log('[Service Worker] Offscreen document created');
}

// Close offscreen document
async function closeOffscreenDocument(): Promise<void> {
  if (await hasOffscreenDocument()) {
    await chrome.offscreen.closeDocument();
    console.log('[Service Worker] Offscreen document closed');
  }
}

// Handle messages from popup, content scripts, and offscreen document
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Service Worker] Message received:', message.type);

  switch (message.type) {
    case 'START_RECORDING':
      handleStartRecording().then(sendResponse);
      return true;

    case 'STOP_RECORDING':
      handleStopRecording().then(sendResponse);
      return true;

    case 'CLICK_CAPTURED':
      handleClickCaptured(message.data, sender.tab?.id);
      sendResponse({ success: true });
      return true;

    case 'CONTENT_SCRIPT_READY':
      console.log('[Service Worker] Content script ready in tab:', sender.tab?.id);
      sendResponse({ success: true });
      return true;

    case 'AUDIO_RECORDED':
      state.audioData = message.data;
      console.log('[Service Worker] Audio data received');
      sendResponse({ success: true });
      return true;

    case 'AUDIO_ERROR':
      console.error('[Service Worker] Audio error:', message.error);
      sendResponse({ success: false });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
      return true;
  }
});

async function handleStartRecording(): Promise<{ success: boolean }> {
  state.isRecording = true;
  state.startTime = Date.now();
  state.steps = [];
  state.audioData = null;

  // Setup offscreen document for audio recording
  try {
    await setupOffscreenDocument();
    // Start audio recording
    await chrome.runtime.sendMessage({ type: 'START_AUDIO' });
    console.log('[Service Worker] Audio recording started');
  } catch (error) {
    console.error('[Service Worker] Failed to start audio:', error);
  }

  // Notify all tabs to start capturing clicks
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE' });
      } catch (error) {
        console.error('Failed to send message to tab:', tab.id, error);
      }
    }
  }

  console.log('[Service Worker] Recording started');
  return { success: true };
}

async function handleStopRecording(): Promise<{
  success: boolean;
  steps: CapturedStep[];
  audioData: string | null;
}> {
  state.isRecording = false;

  // Stop audio recording
  try {
    await chrome.runtime.sendMessage({ type: 'STOP_AUDIO' });
    console.log('[Service Worker] Audio recording stopped');

    // Wait a bit for audio data to be processed
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Close offscreen document
    await closeOffscreenDocument();
  } catch (error) {
    console.error('[Service Worker] Failed to stop audio:', error);
  }

  // Notify all tabs to stop capturing clicks
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'STOP_CAPTURE' });
      } catch (error) {
        // Tab might not have content script, ignore
      }
    }
  }

  const steps = [...state.steps];
  const audioData = state.audioData;

  state.steps = [];
  state.startTime = null;
  state.audioData = null;

  console.log('[Service Worker] Recording stopped, steps:', steps.length, 'audio:', !!audioData);
  return { success: true, steps, audioData };
}

async function handleClickCaptured(
  data: CapturedStep,
  tabId: number | undefined
): Promise<void> {
  if (!state.isRecording || !tabId) return;

  // Capture screenshot before adding the step
  try {
    const screenshot = await chrome.tabs.captureVisibleTab(undefined, {
      format: 'png',
    });
    data.screenshot = screenshot;
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
  }

  state.steps.push(data);
  console.log('[Service Worker] Step captured:', state.steps.length);
}

// Listen for tab URL changes (navigation)
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (!state.isRecording || details.frameId !== 0) return;

  const timestamp = Date.now() - (state.startTime || 0);

  try {
    const screenshot = await chrome.tabs.captureVisibleTab(undefined, {
      format: 'png',
    });

    state.steps.push({
      timestamp,
      type: 'navigation',
      url: details.url,
      screenshot,
    });

    console.log('[Service Worker] Navigation captured:', details.url);
  } catch (error) {
    console.error('Failed to capture navigation:', error);
  }
});

console.log('[Service Worker] Vibe Tuto extension loaded');
