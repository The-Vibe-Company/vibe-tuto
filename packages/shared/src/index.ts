export interface Tutorial {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: 'draft' | 'processing' | 'ready';
  createdAt: string;
  updatedAt: string;
}

export interface Step {
  id: string;
  tutorialId: string;
  orderIndex: number;
  screenshotUrl: string;
  textContent: string;
  clickX: number | null;
  clickY: number | null;
}

export interface CapturedEvent {
  screenshot: string;
  timestamp: number;
  type: 'click' | 'navigation';
  x: number | null;
  y: number | null;
  url: string;
}
