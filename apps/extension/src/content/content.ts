// Content script - Injected into all pages
// Handles click detection and DOM events

import { getElementInfo } from './element-label';

interface ClickEventData {
  timestamp: number;
  type: 'click';
  x: number;
  y: number;
  viewportWidth: number;
  viewportHeight: number;
  url: string;
  elementInfo: {
    tag: string;
    text: string;
    id?: string;
    className?: string;
    role?: string;
    actionableTag?: string;
  };
}

let isRecording = false;
let recordingStartTime = 0;

function captureClickEvent(event: MouseEvent): void {
  if (!isRecording) return;

  const target = event.target as HTMLElement;
  const timestamp = Date.now() - recordingStartTime;

  // Use smart element labeling to get clean, human-readable labels
  const elementInfo = getElementInfo(target);

  const clickData: ClickEventData = {
    timestamp,
    type: 'click',
    x: event.clientX,
    y: event.clientY,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    url: window.location.href,
    elementInfo,
  };

  // Send to service worker
  chrome.runtime.sendMessage({
    type: 'CLICK_CAPTURED',
    data: clickData,
  });
}

// Handle microphone permission request via iframe
function requestMicrophonePermission(sendResponse: (response: { success: boolean }) => void): void {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'display:none;width:0;height:0;border:none;position:absolute;';
  iframe.setAttribute('allow', 'microphone');
  iframe.src = chrome.runtime.getURL('permission-frame/permission-frame.html');

  const onMessage = (event: MessageEvent): void => {
    // Only accept messages from our iframe
    if (event.source !== iframe.contentWindow) return;

    if (event.data.type === 'PERMISSION_GRANTED') {
      console.log('[Content] Microphone permission granted via iframe');
      chrome.runtime.sendMessage({ type: 'MICROPHONE_PERMISSION_GRANTED' });
      cleanup();
    } else if (event.data.type === 'PERMISSION_DENIED') {
      console.log('[Content] Microphone permission denied:', event.data.error);
      chrome.runtime.sendMessage({ type: 'MICROPHONE_PERMISSION_DENIED', error: event.data.error });
      cleanup();
    }
  };

  const cleanup = (): void => {
    window.removeEventListener('message', onMessage);
    iframe.remove();
  };

  window.addEventListener('message', onMessage);
  document.body.appendChild(iframe);
  sendResponse({ success: true });
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    // Skip if already recording to prevent duplicate listeners
    if (isRecording) {
      sendResponse({ success: true });
      return true;
    }
    isRecording = true;
    // Use provided startTime from service worker, or fallback to Date.now()
    recordingStartTime = message.startTime || Date.now();
    document.addEventListener('click', captureClickEvent, true);
    sendResponse({ success: true });
  }

  if (message.type === 'STOP_CAPTURE') {
    isRecording = false;
    document.removeEventListener('click', captureClickEvent, true);
    sendResponse({ success: true });
  }

  if (message.type === 'REQUEST_MICROPHONE_PERMISSION') {
    requestMicrophonePermission(sendResponse);
    return true; // Keep channel open for async response
  }

  return true;
});

// Notify service worker that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });

// Allowed origins for auth sync messages
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
  'https://vibe-tuto.vercel.app',
  'https://captuto.com',
];

// Listen for auth messages from the web app
window.addEventListener('message', async (event) => {
  // Strict origin validation - only accept exact matches
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;

  if (event.data?.type === 'CAPTUTO_AUTH') {
    const { authToken, userEmail } = event.data;

    // Handle logout: clear storage when tokens are null/undefined
    if (authToken === null || authToken === undefined) {
      await chrome.storage.local.remove(['authToken', 'userEmail']);
      console.log('[CapTuto] Auth cleared (logout)');
      window.postMessage({ type: 'CAPTUTO_AUTH_SYNCED' }, '*');
      return;
    }

    // Handle login: store auth when both values are present
    if (authToken && userEmail) {
      await chrome.storage.local.set({ authToken, userEmail });
      console.log('[CapTuto] Auth synced from web app');
      window.postMessage({ type: 'CAPTUTO_AUTH_SYNCED' }, '*');
    }
  }
});

console.log('[CapTuto] Content script loaded');
