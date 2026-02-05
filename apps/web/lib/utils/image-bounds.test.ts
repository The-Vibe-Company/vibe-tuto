import { describe, it, expect } from 'vitest';
import { getImageBounds } from './image-bounds';

describe('getImageBounds', () => {
  it('returns container dimensions when natural dimensions are zero', () => {
    const result = getImageBounds(800, 600, 0, 0);
    expect(result).toEqual({
      offsetX: 0,
      offsetY: 0,
      displayWidth: 800,
      displayHeight: 600,
    });
  });

  it('returns container dimensions when natural width is zero', () => {
    const result = getImageBounds(800, 600, 0, 100);
    expect(result).toEqual({
      offsetX: 0,
      offsetY: 0,
      displayWidth: 800,
      displayHeight: 600,
    });
  });

  it('returns container dimensions when natural height is zero', () => {
    const result = getImageBounds(800, 600, 100, 0);
    expect(result).toEqual({
      offsetX: 0,
      offsetY: 0,
      displayWidth: 800,
      displayHeight: 600,
    });
  });

  it('letterboxes when image is wider than container', () => {
    // 1920x1080 image in 800x600 container
    // Image aspect (1.78) > container aspect (1.33)
    // Full width, letterbox top/bottom
    const result = getImageBounds(800, 600, 1920, 1080);
    expect(result.displayWidth).toBe(800);
    expect(result.displayHeight).toBeCloseTo(450, 0);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBeCloseTo(75, 0);
  });

  it('pillarboxes when image is taller than container', () => {
    // 600x1200 image in 800x600 container
    // Image aspect (0.5) < container aspect (1.33)
    // Full height, pillarbox left/right
    const result = getImageBounds(800, 600, 600, 1200);
    expect(result.displayHeight).toBe(600);
    expect(result.displayWidth).toBeCloseTo(300, 0);
    expect(result.offsetX).toBeCloseTo(250, 0);
    expect(result.offsetY).toBe(0);
  });

  it('perfect fit when aspects match', () => {
    // Same aspect ratio
    const result = getImageBounds(800, 600, 1600, 1200);
    expect(result.displayWidth).toBeCloseTo(800, 5);
    expect(result.displayHeight).toBeCloseTo(600, 5);
    expect(result.offsetX).toBeCloseTo(0, 5);
    expect(result.offsetY).toBeCloseTo(0, 5);
  });

  it('handles extreme wide ratio', () => {
    // Very wide image 10000x100 in 800x600
    const result = getImageBounds(800, 600, 10000, 100);
    expect(result.displayWidth).toBe(800);
    expect(result.displayHeight).toBeCloseTo(8, 0);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBeCloseTo(296, 0);
  });

  it('handles extreme tall ratio', () => {
    // Very tall image 100x10000 in 800x600
    const result = getImageBounds(800, 600, 100, 10000);
    expect(result.displayHeight).toBe(600);
    expect(result.displayWidth).toBeCloseTo(6, 0);
    expect(result.offsetX).toBeCloseTo(397, 0);
    expect(result.offsetY).toBe(0);
  });

  it('handles square image in non-square container', () => {
    // Square image in wider container
    const result = getImageBounds(800, 600, 500, 500);
    expect(result.displayHeight).toBe(600);
    expect(result.displayWidth).toBe(600);
    expect(result.offsetX).toBe(100);
    expect(result.offsetY).toBe(0);
  });

  it('handles square container with non-square image', () => {
    // Wide image in square container
    const result = getImageBounds(600, 600, 1200, 800);
    expect(result.displayWidth).toBe(600);
    expect(result.displayHeight).toBeCloseTo(400, 0);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBeCloseTo(100, 0);
  });
});
