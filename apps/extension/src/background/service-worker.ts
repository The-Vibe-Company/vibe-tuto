// Service Worker - Background script for Chrome Extension
// Handles communication between popup, content scripts, and offscreen documents

interface RecordingState {
  isRecording: boolean;
  startTime: number | null;
  steps: CapturedStep[];
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
};

// Handle messages from popup and content scripts
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

    default:
      sendResponse({ error: 'Unknown message type' });
      return true;
  }
});

async function handleStartRecording(): Promise<{ success: boolean }> {
  state.isRecording = true;
  state.startTime = Date.now();
  state.steps = [];

  // Notify all tabs to start capturing
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

async function handleStopRecording(): Promise<{ success: boolean; steps: CapturedStep[] }> {
  state.isRecording = false;

  // Notify all tabs to stop capturing
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
  state.steps = [];
  state.startTime = null;

  console.log('[Service Worker] Recording stopped, steps:', steps.length);
  return { success: true, steps };
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
