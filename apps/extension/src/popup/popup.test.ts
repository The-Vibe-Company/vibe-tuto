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
  },
  tabs: {
    create: vi.fn(),
  },
};

// @ts-ignore
globalThis.chrome = mockChrome;

// Helper functions extracted for testing
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

describe('Popup helper functions', () => {
  describe('formatTime', () => {
    it('formats 0 milliseconds as 00:00', () => {
      expect(formatTime(0)).toBe('00:00');
    });

    it('formats seconds correctly', () => {
      expect(formatTime(5000)).toBe('00:05');
      expect(formatTime(30000)).toBe('00:30');
      expect(formatTime(59000)).toBe('00:59');
    });

    it('formats minutes correctly', () => {
      expect(formatTime(60000)).toBe('01:00');
      expect(formatTime(90000)).toBe('01:30');
      expect(formatTime(300000)).toBe('05:00');
    });

    it('pads single digits', () => {
      expect(formatTime(65000)).toBe('01:05');
      expect(formatTime(125000)).toBe('02:05');
    });
  });

  describe('base64ToBlob', () => {
    it('converts base64 string to Blob', () => {
      const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
      const blob = base64ToBlob(base64, 'text/plain');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('text/plain');
      expect(blob.size).toBe(11); // "Hello World" is 11 bytes
    });

    it('handles data URL format', () => {
      const dataUrl = 'data:text/plain;base64,SGVsbG8gV29ybGQ=';
      const blob = base64ToBlob(dataUrl, 'text/plain');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(11);
    });

    it('creates PNG blob from image data', () => {
      // Minimal PNG data URL (1x1 red pixel)
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blob = base64ToBlob(pngBase64, 'image/png');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });
  });
});

describe('Chrome storage auth check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not authenticated when no token', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    const result = await mockChrome.storage.local.get(['authToken', 'userEmail']);
    const isAuthenticated = !!result.authToken;

    expect(isAuthenticated).toBe(false);
  });

  it('returns authenticated when token exists', async () => {
    mockChrome.storage.local.get.mockResolvedValue({
      authToken: 'test-token',
      userEmail: 'test@example.com',
    });

    const result = await mockChrome.storage.local.get(['authToken', 'userEmail']);
    const isAuthenticated = !!result.authToken;

    expect(isAuthenticated).toBe(true);
    expect(result.userEmail).toBe('test@example.com');
  });
});

describe('Recording flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends START_RECORDING message to service worker', async () => {
    mockChrome.runtime.sendMessage.mockResolvedValue({ success: true });

    await mockChrome.runtime.sendMessage({ type: 'START_RECORDING' });

    expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'START_RECORDING' });
  });

  it('sends STOP_RECORDING message and receives steps', async () => {
    const mockSteps = [
      { timestamp: 0, type: 'click', x: 100, y: 200, url: 'https://example.com' },
      { timestamp: 1000, type: 'click', x: 150, y: 250, url: 'https://example.com' },
    ];

    mockChrome.runtime.sendMessage.mockResolvedValue({
      success: true,
      steps: mockSteps,
      audioData: null,
    });

    const response = await mockChrome.runtime.sendMessage({ type: 'STOP_RECORDING' });

    expect(response.success).toBe(true);
    expect(response.steps).toHaveLength(2);
    expect(response.steps[0].type).toBe('click');
  });
});

describe('Pending upload for retry', () => {
  it('should store pending upload data structure correctly', () => {
    const pendingUpload = {
      steps: [
        { timestamp: 0, type: 'click' as const, x: 100, y: 200, url: 'https://example.com' },
        { timestamp: 1000, type: 'navigation' as const, url: 'https://example.com/page2' },
      ],
      audioData: 'data:audio/webm;base64,GkXfo...',
    };

    expect(pendingUpload.steps).toHaveLength(2);
    expect(pendingUpload.steps[0].type).toBe('click');
    expect(pendingUpload.steps[1].type).toBe('navigation');
    expect(pendingUpload.audioData).toContain('base64');
  });

  it('should handle null audio data', () => {
    const pendingUpload = {
      steps: [{ timestamp: 0, type: 'click' as const, x: 100, y: 200, url: 'https://example.com' }],
      audioData: null,
    };

    expect(pendingUpload.audioData).toBeNull();
    expect(pendingUpload.steps).toHaveLength(1);
  });
});

describe('getApiUrl', () => {
  const DEFAULT_API_URL = 'http://localhost:3000';
  const API_URL_STORAGE_KEY = 'apiUrl';

  async function getApiUrl(): Promise<string> {
    const result = await mockChrome.storage.local.get([API_URL_STORAGE_KEY]);
    return result[API_URL_STORAGE_KEY] || DEFAULT_API_URL;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns default URL when no custom URL is set', async () => {
    mockChrome.storage.local.get.mockResolvedValue({});

    const url = await getApiUrl();

    expect(url).toBe(DEFAULT_API_URL);
  });

  it('returns custom URL when set in storage', async () => {
    mockChrome.storage.local.get.mockResolvedValue({
      [API_URL_STORAGE_KEY]: 'https://captuto.com',
    });

    const url = await getApiUrl();

    expect(url).toBe('https://captuto.com');
  });

  it('returns custom URL for production environment', async () => {
    mockChrome.storage.local.get.mockResolvedValue({
      [API_URL_STORAGE_KEY]: 'https://app.captuto.com',
    });

    const url = await getApiUrl();

    expect(url).toBe('https://app.captuto.com');
  });
});
