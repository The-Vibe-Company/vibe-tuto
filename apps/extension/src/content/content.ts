// Content script - Injected into all pages
// Handles click detection and DOM events

interface ClickEventData {
  timestamp: number;
  type: 'click';
  x: number;
  y: number;
  url: string;
  elementInfo: {
    tag: string;
    text: string;
    id?: string;
    className?: string;
  };
}

let isRecording = false;
let recordingStartTime = 0;

function captureClickEvent(event: MouseEvent): void {
  if (!isRecording) return;

  const target = event.target as HTMLElement;
  const timestamp = Date.now() - recordingStartTime;

  // Handle SVG elements where className is SVGAnimatedString instead of string
  const className =
    typeof target.className === 'string'
      ? target.className
      : target.getAttribute?.('class') || undefined;

  const clickData: ClickEventData = {
    timestamp,
    type: 'click',
    x: event.clientX,
    y: event.clientY,
    url: window.location.href,
    elementInfo: {
      tag: target.tagName,
      text: target.textContent?.slice(0, 100) || '',
      id: target.id || undefined,
      className: className || undefined,
    },
  };

  // Send to service worker
  chrome.runtime.sendMessage({
    type: 'CLICK_CAPTURED',
    data: clickData,
  });
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'START_CAPTURE') {
    isRecording = true;
    recordingStartTime = Date.now();
    document.addEventListener('click', captureClickEvent, true);
    sendResponse({ success: true });
  }

  if (message.type === 'STOP_CAPTURE') {
    isRecording = false;
    document.removeEventListener('click', captureClickEvent, true);
    sendResponse({ success: true });
  }

  return true;
});

// Notify service worker that content script is ready
chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });

console.log('[Vibe Tuto] Content script loaded');
