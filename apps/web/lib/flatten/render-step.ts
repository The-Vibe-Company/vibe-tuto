import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { Annotation } from '@/lib/types/editor';
import { drawAnnotations } from './draw-annotations';

/**
 * Render the original screenshot with annotations baked in.
 * Returns a PNG buffer at the natural resolution of the source image.
 */
export async function renderFlattened(
  originalImageBuffer: Buffer,
  annotations: Annotation[],
): Promise<Buffer> {
  const image = await loadImage(originalImageBuffer);
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);

  if (annotations.length > 0) {
    drawAnnotations(ctx, annotations, image);
  }

  return canvas.toBuffer('image/png');
}
