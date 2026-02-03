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
  viewportWidth?: number;
  viewportHeight?: number;
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
      (async () => {
        const result = await handleStartRecording();
        console.log('[Service Worker] Sending START_RECORDING response:', result);
        sendResponse(result);
      })();
      return true;

    case 'STOP_RECORDING':
      (async () => {
        const result = await handleStopRecording();
        console.log('[Service Worker] Sending STOP_RECORDING response:', { success: result.success, stepsCount: result.steps.length });
        sendResponse(result);
      })();
      return true;

    case 'CLICK_CAPTURED':
      handleClickCaptured(message.data, sender.tab?.id);
      sendResponse({ success: true });
      return true;

    case 'CONTENT_SCRIPT_READY':
      console.log('[Service Worker] Content script ready in tab:', sender.tab?.id);
      // If we're recording and a content script just loaded, tell it to start capturing
      if (state.isRecording && sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, { type: 'START_CAPTURE', startTime: state.startTime }).catch(() => {
          // Ignore errors
        });
        console.log('[Service Worker] Sent START_CAPTURE to newly ready tab:', sender.tab.id);
      }
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

  // Setup offscreen document for audio recording (optional - continue if fails)
  try {
    await setupOffscreenDocument();
    // Wait for offscreen document to be ready (it needs time to load and execute)
    await new Promise((resolve) => setTimeout(resolve, 200));
    // Start audio recording
    await chrome.runtime.sendMessage({ type: 'START_AUDIO' });
    console.log('[Service Worker] Audio recording started');
  } catch (error) {
    console.log('[Service Worker] Audio recording not available (permission denied or error):', error);
    // Continue without audio - it's optional
  }

  // Notify active tab to start capturing clicks
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const tab of tabs) {
    if (tab.id && tab.url && !tab.url.startsWith('chrome://')) {
      try {
        // Try to send message to existing content script
        await chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE', startTime: state.startTime });
        console.log('[Service Worker] START_CAPTURE sent to tab:', tab.id);
      } catch (error) {
        // Content script not ready - inject it programmatically
        console.log('[Service Worker] Content script not ready, injecting...', tab.id);
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/content.js'],
          });
          // Wait a bit for script to initialize
          await new Promise((resolve) => setTimeout(resolve, 100));
          // Retry sending the message
          await chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE', startTime: state.startTime });
          console.log('[Service Worker] Content script injected and START_CAPTURE sent');
        } catch (injectError) {
          console.error('[Service Worker] Failed to inject content script:', injectError);
        }
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

  // Store result in chrome.storage for popup to retrieve
  // This avoids message size limits with sendResponse
  const result = { success: true, steps, audioData };
  await chrome.storage.local.set({ recordingResult: result });
  console.log('[Service Worker] Recording result stored in storage');

  return result;
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

// Listen for tab activation changes during recording
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (!state.isRecording) return;

  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // Ignore chrome:// and other unsupported URLs
    if (!tab.url || tab.url.startsWith('chrome://')) return;

    console.log('[Service Worker] Tab activated during recording:', activeInfo.tabId);

    try {
      // Try to send START_CAPTURE to the new active tab with the original startTime
      await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'START_CAPTURE', startTime: state.startTime });
      console.log('[Service Worker] START_CAPTURE sent to new active tab');
    } catch (error) {
      // Content script not ready - inject it
      console.log('[Service Worker] Injecting content script to new tab...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: activeInfo.tabId },
          files: ['content/content.js'],
        });
        // Wait for initialization
        await new Promise((resolve) => setTimeout(resolve, 100));
        await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'START_CAPTURE', startTime: state.startTime });
        console.log('[Service Worker] Content script injected and START_CAPTURE sent');
      } catch (injectError) {
        console.error('[Service Worker] Failed to inject content script:', injectError);
      }
    }
  } catch (error) {
    // Tab may have been closed before we could get its info
    console.error('[Service Worker] Failed to get tab info:', error);
  }
});

console.log('[Service Worker] Vibe Tuto extension loaded');
