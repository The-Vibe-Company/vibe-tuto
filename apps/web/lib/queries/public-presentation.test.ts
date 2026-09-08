import { expect, it } from 'vitest';
import { publicPresentationSteps } from './public-presentation';
import type { StepWithSignedUrl } from '@/lib/types/editor';

it('never serializes raw captures, hidden URLs, or annotations for public readers', () => {
  const secret = 'a-private-window-title';
  const step = {
    id: 'step', tutorial_id: 'tutorial', source_id: 'source', order_index: 0,
    text_content: 'Open settings', description: 'Use the menu.', step_type: 'image', created_at: '',
    signedScreenshotUrl: 'https://storage.example/private-image?token=secret',
    annotations: [{ id: 'blur', type: 'blur', x: 0, y: 0, width: 1, height: 1 }],
    source: { window_title: secret, screenshot_url: 'user/source.png', element_info: { text: secret } },
    element_info: { text: secret }, url: 'https://secret.example', show_url: false,
  } as StepWithSignedUrl;
  const result = publicPresentationSteps([step], 'public-token')[0];
  expect(result.signedScreenshotUrl).toBe('/api/public/tutorials/public-token/steps/step/preview');
  expect(result.annotations).toEqual([]);
  expect(result.url).toBeNull();
  expect(result.source).toBeNull();
  expect(JSON.stringify(result)).not.toContain(secret);
  expect(JSON.stringify(result)).not.toContain('storage.example');
  expect(publicPresentationSteps([step], null)[0].signedScreenshotUrl).toBeNull();
});
