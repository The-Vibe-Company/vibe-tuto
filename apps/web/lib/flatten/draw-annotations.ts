import type {
  SKRSContext2D,
  Image as SkiaImage,
} from '@napi-rs/canvas';
import { createCanvas } from '@napi-rs/canvas';
import type { Annotation } from '@/lib/types/editor';
import { getStrokePx, DEFAULT_ANNOTATION_STYLE } from '@/lib/constants/annotation-styles';

const PIXELATE_BLOCK_SIZE = 12;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * Server-side port of AnnotationCanvas#drawAnnotations. Draws annotations
 * directly onto the supplied context, in the natural pixel space of the
 * source image. No animation: animTime is always 0 (static frame).
 *
 * The image is rendered at its natural size (no letterboxing), so the
 * (offsetX, offsetY) is (0, 0) and (displayWidth, displayHeight) equals
 * (image.width, image.height).
 */
export function drawAnnotations(
  ctx: SKRSContext2D,
  annotations: Annotation[],
  image: SkiaImage,
): void {
  const dw = image.width;
  const dh = image.height;
  const oX = 0;
  const oY = 0;

  for (const ann of annotations) {
    const x = oX + ann.x * dw;
    const y = oY + ann.y * dh;
    const annColor = ann.color || DEFAULT_ANNOTATION_STYLE.color;
    const annStroke = getStrokePx(ann.strokeWidth);
    const annFontSize = ann.fontSize || DEFAULT_ANNOTATION_STYLE.fontSize;
    const annOpacity = ann.opacity ?? DEFAULT_ANNOTATION_STYLE.opacity;
    const annTextBg = ann.textBackground || DEFAULT_ANNOTATION_STYLE.textBackground;

    switch (ann.type) {
      case 'circle': {
        const w = (ann.width || 0.1) * dw;
        const h = (ann.height || 0.1) * dh;
        const cx = x + w / 2;
        const cy = y + h / 2;

        ctx.save();
        ctx.shadowColor = annColor;
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = annColor;
        ctx.lineWidth = annStroke;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(w / 2, 1), Math.max(h / 2, 1), 0, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
        break;
      }
      case 'arrow': {
        const endX = oX + (ann.endX || ann.x + 0.1) * dw;
        const endY = oY + (ann.endY || ann.y) * dh;
        drawArrow(ctx, x, y, endX, endY, annColor, annStroke);
        break;
      }
      case 'text': {
        const scaledFont = annFontSize;
        ctx.font = `600 ${scaledFont}px Inter, system-ui, sans-serif`;
        const text = ann.content || 'Text';
        const metrics = ctx.measureText(text);
        const textHeight = scaledFont;
        const padX = 8;
        const padY = 4;

        if (annTextBg !== 'none') {
          const bgX = x - padX;
          const bgY = y - textHeight - padY;
          const bgW = metrics.width + padX * 2;
          const bgH = textHeight + padY * 2;

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 1;

          ctx.fillStyle = annColor;
          ctx.beginPath();
          if (annTextBg === 'pill') {
            roundRect(ctx, bgX, bgY, bgW, bgH, bgH / 2);
          } else {
            roundRect(ctx, bgX, bgY, bgW, bgH, 4);
          }
          ctx.fill();
          ctx.restore();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(text, x, y - padY);
        } else {
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
          ctx.shadowBlur = 3;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 1;
          ctx.fillStyle = annColor;
          ctx.fillText(text, x, y);
          ctx.restore();
        }
        break;
      }
      case 'numbered-callout': {
        const num = ann.calloutNumber || 1;
        const radius = Math.max((ann.fontSize || 16), 16);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = annColor;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();

        const numStr = String(num);
        ctx.font = `700 ${radius}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(numStr, x, y + 1);
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
        break;
      }
      case 'highlight': {
        const w = (ann.width || 0.1) * dw;
        const h = (ann.height || 0.05) * dh;

        ctx.save();
        ctx.globalAlpha = annOpacity;
        ctx.fillStyle = annColor;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'blur': {
        const w = (ann.width || 0.1) * dw;
        const h = (ann.height || 0.1) * dh;

        try {
          ctx.save();
          ctx.beginPath();
          roundRect(ctx, x, y, w, h, 6);
          ctx.clip();

          const blockSize = PIXELATE_BLOCK_SIZE;
          const smallW = Math.max(1, Math.ceil(w / blockSize));
          const smallH = Math.max(1, Math.ceil(h / blockSize));

          // Downsample then upscale: same algorithm as the client, but in
          // natural-image space, so srcX/srcY are simply (x, y).
          const offscreen = createCanvas(smallW, smallH);
          const offCtx = offscreen.getContext('2d');
          // Source coords are already in natural image pixels (oX=oY=0,
          // dw=image.width, dh=image.height).
          offCtx.drawImage(image, x, y, w, h, 0, 0, smallW, smallH);

          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(offscreen, 0, 0, smallW, smallH, x, y, w, h);
          ctx.imageSmoothingEnabled = true;
          ctx.restore();
        } catch {
          ctx.save();
          ctx.fillStyle = 'rgba(180, 180, 180, 0.9)';
          ctx.beginPath();
          roundRect(ctx, x, y, w, h, 6);
          ctx.fill();
          ctx.restore();
        }

        ctx.strokeStyle = 'rgba(160, 160, 160, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundRect(ctx, x, y, w, h, 6);
        ctx.stroke();
        break;
      }
      case 'click-indicator': {
        const color = annColor;
        const { r, g, b } = hexToRgb(color);

        // Static frame: skip animated ripples; render outer glow + center dot
        // exactly as the unanimated client view at animTime = 0.
        ctx.save();
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 14);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const dotRadius = 5;
        ctx.save();
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        break;
      }
    }
  }
}

function drawArrow(
  ctx: SKRSContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  strokePx: number,
): void {
  const lineLength = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
  const headLength = Math.min(Math.max(lineLength * 0.2, 10), 20);
  const headWidth = headLength * 0.6;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  const lineEndX = toX - headLength * Math.cos(angle);
  const lineEndY = toY - headLength * Math.sin(angle);

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokePx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.atan2(headWidth, headLength)),
    toY - headLength * Math.sin(angle - Math.atan2(headWidth, headLength))
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.atan2(headWidth, headLength)),
    toY - headLength * Math.sin(angle + Math.atan2(headWidth, headLength))
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function roundRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}
