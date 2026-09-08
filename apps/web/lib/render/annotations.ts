import sharp, { type OverlayOptions } from 'sharp';
import type { Annotation } from '@/lib/types/editor';
import { DEFAULT_ANNOTATION_STYLE, getStrokePx, annotationScale } from '@/lib/constants/annotation-styles';

import { annotationFont, svgText } from './annotation-font';

const unit = (n: number | undefined, fallback = 0) => Number.isFinite(n) ? Math.min(1, Math.max(0, n!)) : fallback;

/** Normalized image coordinates, never screen/window coordinates. No network access. */
export async function renderAnnotatedImage(image: Buffer, annotations: Annotation[] = []): Promise<Buffer> {
  if (image.length > 25 * 1024 * 1024) throw new Error('Screenshot exceeds 25 MB');
  if (annotations.length > 100) throw new Error('A screenshot supports at most 100 annotations');
  const base = await sharp(image, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  const { width: w = 1, height: h = 1 } = await sharp(base).metadata();
  const overlays: OverlayOptions[] = [];
  const styleScale = annotationScale(w);
  for (const ann of annotations) {
    const x = unit(ann.x) * w, y = unit(ann.y) * h;
    const width = Math.min(unit(ann.width, 0.1) * w, w - x);
    const height = Math.min(unit(ann.height, 0.1) * h, h - y);
    const color = /^#[\da-f]{6}$/i.test(ann.color || '') ? ann.color! : DEFAULT_ANNOTATION_STYLE.color;
    const stroke = getStrokePx(ann.strokeWidth) * styleScale;
    const size = Math.min(64, Math.max(10, ann.fontSize || 16)) * styleScale;
    let body = '';
    switch (ann.type) {
      case 'blur': {
        // Flatten pixelation into output: PDF never embeds the unredacted image underneath.
        const left = Math.floor(x), top = Math.floor(y);
        const bw = Math.min(w - left, Math.ceil(width)), bh = Math.min(h - top, Math.ceil(height));
        if (bw > 0 && bh > 0) {
          const tiny = await sharp(base).extract({ left, top, width: bw, height: bh }).resize(Math.max(1, Math.ceil(bw / (12 * styleScale))), Math.max(1, Math.ceil(bh / (12 * styleScale)))).png().toBuffer();
          const input = await sharp(tiny).resize(bw, bh, { kernel: 'nearest' }).png().toBuffer();
          overlays.push({ input, left, top });
        }
        continue;
      }
      case 'rectangle':
        body = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${4 * styleScale}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`;
        break;
      case 'highlight':
        body = `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${4 * styleScale}" fill="${color}" opacity="${unit(ann.opacity, 0.4)}"/>`;
        break;
      case 'circle':
        body = `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" fill="none" stroke="${color}" stroke-width="${stroke}"/>`;
        break;
      case 'arrow': {
        const ex = unit(ann.endX, Math.min(1, ann.x + 0.1)) * w, ey = unit(ann.endY, ann.y) * h;
        const angle = Math.atan2(ey - y, ex - x);
        const head = Math.min(Math.max(Math.hypot(ex - x, ey - y) * 0.2, 10 * styleScale), 20 * styleScale);
        const headAngle = Math.atan2(head * 0.6, head);
        const ax = ex - head * Math.cos(angle - headAngle), ay = ey - head * Math.sin(angle - headAngle);
        const bx = ex - head * Math.cos(angle + headAngle), by = ey - head * Math.sin(angle + headAngle);
        body = `<path d="M ${x} ${y} L ${ex - head * Math.cos(angle)} ${ey - head * Math.sin(angle)}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" fill="none"/><path d="M ${ex} ${ey} L ${ax} ${ay} L ${bx} ${by} Z" fill="${color}"/>`;
        break;
      }
      case 'text': {
        const content = (ann.content || 'Text').slice(0, 500);
        const background = ann.textBackground || DEFAULT_ANNOTATION_STYLE.textBackground;
        const font = await annotationFont();
        const padX = 8 * styleScale, padY = 4 * styleScale;
        const text = svgText(font, content, size, x, background === 'none' ? y : y - padY, background === 'none' ? color : '#ffffff');
        if (background !== 'none') {
          const bgHeight = size + padY * 2;
          const radius = background === 'pill' ? bgHeight / 2 : 4 * styleScale;
          body = `<rect x="${x - padX}" y="${y - size - padY}" width="${text.width + padX * 2}" height="${bgHeight}" rx="${radius}" fill="${color}"/>`;
        }
        body += text.markup;
        break;
      }
      case 'numbered-callout': {
        const radius = Math.max(size, 16 * styleScale);
        const font = await annotationFont();
        const content = String(Math.max(1, Math.min(999, Math.round(ann.calloutNumber || 1))));
        const textWidth = svgText(font, content, radius, 0, 0, '#ffffff').width;
        // Canvas middle text baseline uses the font's ascent/descent metrics.
        const baseline = y + radius * 0.35;
        body = `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" stroke="#ffffff" stroke-width="${2 * styleScale}"/>` + svgText(font, content, radius, x - textWidth / 2, baseline, '#ffffff').markup;
        break;
      }
      case 'click-indicator':
        body = `<circle cx="${x}" cy="${y}" r="${18 * styleScale}" fill="${color}" fill-opacity=".18" stroke="${color}" stroke-width="${2 * styleScale}"/><circle cx="${x}" cy="${y}" r="${5 * styleScale}" fill="${color}"/>`;
    }
    if (body) overlays.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`), left: 0, top: 0 });
  }
  return sharp(base).composite(overlays).png().toBuffer();
}
