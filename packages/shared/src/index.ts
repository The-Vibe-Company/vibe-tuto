export interface Tutorial {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  slug: string | null;
  status: 'draft' | 'processing' | 'ready';
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  id: string;
  tutorialId: string;
  orderIndex: number;
  screenshotUrl: string | null;
  textContent: string | null;
  timestampStart: number | null;
  timestampEnd: number | null;
  clickX: number | null;
  clickY: number | null;
  clickType: 'click' | 'navigation' | null;
  url: string | null;
  createdAt: string;
}

export interface CapturedEvent {
  screenshot: string;
  timestamp: number;
  type: 'click' | 'navigation';
  x: number | null;
  y: number | null;
  url: string;
}
