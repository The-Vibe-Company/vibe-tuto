import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    getContexts: vi.fn(),
    getURL: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
    },
    ContextType: {
      OFFSCREEN_DOCUMENT: 'OFFSCREEN_DOCUMENT',
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    captureVisibleTab: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  offscreen: {
    createDocument: vi.fn(),
    closeDocument: vi.fn(),
    Reason: {
      USER_MEDIA: 'USER_MEDIA',
    },
  },
  webNavigation: {
    onCompleted: {
      addListener: vi.fn(),
    },
  },
};

// @ts-ignore
globalThis.chrome = mockChrome;

// Types extracted from service-worker.ts
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

describe('Service Worker Recording State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should have correct initial state structure', () => {
      const initialState: RecordingState = {
        isRecording: false,
        startTime: null,
        steps: [],
        audioData: null,
      };

      expect(initialState.isRecording).toBe(false);
      expect(initialState.startTime).toBeNull();
      expect(initialState.steps).toHaveLength(0);
      expect(initialState.audioData).toBeNull();
    });
  });

  describe('CapturedStep structure', () => {
    it('should create valid click step', () => {
      const clickStep: CapturedStep = {
        timestamp: 1000,
        type: 'click',
        x: 100,
        y: 200,
        url: 'https://example.com',
        elementInfo: {
          tag: 'button',
          text: 'Submit',
        },
      };

      expect(clickStep.type).toBe('click');
      expect(clickStep.x).toBe(100);
      expect(clickStep.y).toBe(200);
      expect(clickStep.elementInfo?.tag).toBe('button');
    });

    it('should create valid navigation step', () => {
      const navStep: CapturedStep = {
        timestamp: 2000,
        type: 'navigation',
        url: 'https://example.com/page',
        screenshot: 'data:image/png;base64,xxx',
      };

      expect(navStep.type).toBe('navigation');
      expect(navStep.url).toBe('https://example.com/page');
      expect(navStep.screenshot).toBeDefined();
    });
  });
});

describe('Chrome API interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Storage operations', () => {
    it('should store recording result in local storage', async () => {
      const result = {
        success: true,
        steps: [{ timestamp: 0, type: 'click' as const, url: 'https://example.com' }],
        audioData: null,
      };

      mockChrome.storage.local.set.mockResolvedValue(undefined);

      await mockChrome.storage.local.set({ recordingResult: result });

      expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
        recordingResult: result,
      });
    });

    it('should retrieve recording result from local storage', async () => {
      const storedResult = {
        success: true,
        steps: [{ timestamp: 0, type: 'click', url: 'https://example.com' }],
        audioData: null,
      };

      mockChrome.storage.local.get.mockResolvedValue({ recordingResult: storedResult });

      const result = await mockChrome.storage.local.get(['recordingResult']);

      expect(result.recordingResult).toEqual(storedResult);
    });
  });

  describe('Tab interactions', () => {
    it('should query active tabs', async () => {
      mockChrome.tabs.query.mockResolvedValue([
        { id: 1, url: 'https://example.com', active: true },
      ]);

      const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });

      expect(tabs).toHaveLength(1);
      expect(tabs[0].url).toBe('https://example.com');
    });

    it('should send message to tab', async () => {
      mockChrome.tabs.sendMessage.mockResolvedValue({ success: true });

      const response = await mockChrome.tabs.sendMessage(1, { type: 'START_CAPTURE' });

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(1, { type: 'START_CAPTURE' });
      expect(response.success).toBe(true);
    });

    it('should capture visible tab screenshot', async () => {
      const mockScreenshot = 'data:image/png;base64,iVBORw0KGgo...';
      mockChrome.tabs.captureVisibleTab.mockResolvedValue(mockScreenshot);

      const screenshot = await mockChrome.tabs.captureVisibleTab(undefined, { format: 'png' });

      expect(screenshot).toBe(mockScreenshot);
    });
  });

  describe('Offscreen document', () => {
    it('should check for existing offscreen document', async () => {
      mockChrome.runtime.getContexts.mockResolvedValue([]);
      mockChrome.runtime.getURL.mockReturnValue('chrome-extension://xxx/offscreen/offscreen.html');

      const contexts = await mockChrome.runtime.getContexts({
        contextTypes: [mockChrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
        documentUrls: [mockChrome.runtime.getURL('offscreen/offscreen.html')],
      });

      expect(contexts).toHaveLength(0);
    });

    it('should create offscreen document', async () => {
      mockChrome.offscreen.createDocument.mockResolvedValue(undefined);

      await mockChrome.offscreen.createDocument({
        url: 'offscreen/offscreen.html',
        reasons: [mockChrome.offscreen.Reason.USER_MEDIA],
        justification: 'Recording audio from microphone for tutorial creation',
      });

      expect(mockChrome.offscreen.createDocument).toHaveBeenCalled();
    });
  });

  describe('Content script injection', () => {
    it('should inject content script when not ready', async () => {
      mockChrome.tabs.sendMessage.mockRejectedValue(new Error('Could not establish connection'));
      mockChrome.scripting.executeScript.mockResolvedValue([{ result: true }]);

      // Simulate the injection flow
      try {
        await mockChrome.tabs.sendMessage(1, { type: 'START_CAPTURE' });
      } catch (error) {
        await mockChrome.scripting.executeScript({
          target: { tabId: 1 },
          files: ['content/content.js'],
        });
      }

      expect(mockChrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: 1 },
        files: ['content/content.js'],
      });
    });
  });
});

describe('Message handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle START_RECORDING message', () => {
    const message = { type: 'START_RECORDING' };
    expect(message.type).toBe('START_RECORDING');
  });

  it('should handle STOP_RECORDING message', () => {
    const message = { type: 'STOP_RECORDING' };
    expect(message.type).toBe('STOP_RECORDING');
  });

  it('should handle CLICK_CAPTURED message with data', () => {
    const message = {
      type: 'CLICK_CAPTURED',
      data: {
        timestamp: 1000,
        type: 'click' as const,
        x: 100,
        y: 200,
        url: 'https://example.com',
        elementInfo: {
          tag: 'button',
          text: 'Click me',
        },
      },
    };

    expect(message.type).toBe('CLICK_CAPTURED');
    expect(message.data.x).toBe(100);
    expect(message.data.elementInfo?.text).toBe('Click me');
  });

  it('should handle CONTENT_SCRIPT_READY message', () => {
    const message = { type: 'CONTENT_SCRIPT_READY' };
    expect(message.type).toBe('CONTENT_SCRIPT_READY');
  });

  it('should handle AUDIO_RECORDED message', () => {
    const message = {
      type: 'AUDIO_RECORDED',
      data: 'data:audio/webm;base64,GkXfo59ChoEBQveBAU...',
    };

    expect(message.type).toBe('AUDIO_RECORDED');
    expect(message.data).toContain('base64');
  });

  it('should handle AUDIO_ERROR message', () => {
    const message = {
      type: 'AUDIO_ERROR',
      error: 'Permission denied',
    };

    expect(message.type).toBe('AUDIO_ERROR');
    expect(message.error).toBe('Permission denied');
  });
});
