import { describe, it, expect } from 'vitest';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';
import { renderAnnotatedImage } from './annotations';
import { renderTutorialPdf } from './tutorial-pdf';

async function whiteImage() {
  return sharp({ create: { width: 400, height: 200, channels: 3, background: '#ffffff' } }).png().toBuffer();
}
async function pixel(image: Buffer, x: number, y: number) {
  return [...await sharp(image).removeAlpha().extract({ left: x, top: y, width: 1, height: 1 }).raw().toBuffer()];
}

describe('agent visual feedback', () => {
  it('places rectangle in normalized screenshot coordinates, preserves interior', async () => {
    const image = await renderAnnotatedImage(await whiteImage(), [{ id: 'box', type: 'rectangle', x: 0.25, y: 0.25, width: 0.5, height: 0.5, color: '#ff0000', strokeWidth: 3 }]);
    expect(await pixel(image, 100, 75)).toEqual([255, 0, 0]);
    expect(await pixel(image, 200, 100)).toEqual([255, 255, 255]);
    expect(await pixel(image, 20, 20)).toEqual([255, 255, 255]);
  });
  it('can point an arrow to coordinate zero', async () => {
    const image = await renderAnnotatedImage(await whiteImage(), [{ id: 'arrow', type: 'arrow', x: 0.5, y: 0.5, endX: 0, endY: 0.5, color: '#ff0000', strokeWidth: 3 }]);
    expect(await pixel(image, 30, 100)).toEqual([255, 0, 0]);
    expect(await pixel(image, 250, 100)).toEqual([255, 255, 255]);
  });
  it('flattens redaction into image pixels', async () => {
    const input = await sharp({ create: { width: 400, height: 200, channels: 3, background: '#fff' } }).composite([{ input: Buffer.from('<svg width="400" height="200"><path d="M 120 0 V 200" stroke="black" stroke-width="2"/></svg>') }]).png().toBuffer();
    const result = await renderAnnotatedImage(input, [{ id: 'redact', type: 'blur', x: 0.2, y: 0, width: 0.2, height: 1 }]);
    expect(await pixel(result, 120, 100)).not.toEqual(await pixel(input, 120, 100));
  });
  it('scales style sizes with screenshot width and honors pill, rectangle and no background', async () => {
    const base = await sharp({ create: { width: 1000, height: 500, channels: 3, background: '#fff' } }).png().toBuffer();
    const annotation = { id: 'label', type: 'text' as const, x: 0.1, y: 0.3, fontSize: 24, content: 'Ouvrir les réglages', color: '#ff0000' };
    const pill = await renderAnnotatedImage(base, [{ ...annotation, textBackground: 'pill' }]);
    const rectangle = await renderAnnotatedImage(base, [{ ...annotation, textBackground: 'rectangle' }]);
    const plain = await renderAnnotatedImage(base, [{ ...annotation, textBackground: 'none' }]);
    expect(await pixel(pill, 112, 151)).toEqual([255, 0, 0]);
    expect(await pixel(rectangle, 112, 151)).toEqual([255, 0, 0]);
    expect(await pixel(plain, 112, 151)).toEqual([255, 255, 255]);
    expect(await pixel(pill, 93, 126)).toEqual([255, 255, 255]);
    expect(await pixel(rectangle, 93, 126)).toEqual([255, 0, 0]);
    const largeBase = await sharp(base).resize(2000, 1000).toBuffer();
    const large = await renderAnnotatedImage(largeBase, [{ ...annotation, textBackground: 'rectangle' }]);
    expect(await pixel(large, 224, 302)).toEqual([255, 0, 0]);
    expect(await pixel(large, 180, 302)).toEqual([255, 255, 255]);
    if (process.env.CAPTUTO_ANNOTATION_SAMPLE) await writeFile(process.env.CAPTUTO_ANNOTATION_SAMPLE, pill);
  });
  it('escapes annotation text so markup cannot alter the rendering', async () => {
    await expect(renderAnnotatedImage(await whiteImage(), [{ id: 'text', type: 'text', x: 0.1, y: 0.2, content: '<script>&"invalid' }])).resolves.toBeInstanceOf(Buffer);
  });
});

describe('PDF guide', () => {
  it('creates a real paginated PDF with embedded screenshots and French text', async () => {
    const image = await whiteImage();
    const bytes = await renderTutorialPdf({ title: 'Démarrer avec Companion', description: 'Un guide pour votre nouveau collègue.', steps: Array.from({ length: 5 }, (_, i) => ({ text_content: `Étape ${i + 1} : ouvrez les réglages`, description: 'Choisissez votre espace de travail.', step_type: 'image' as const, image, annotations: [{ id: 'box', type: 'rectangle' as const, x: 0.2, y: 0.2, width: 0.3, height: 0.3 }] })) });
    if (process.env.CAPTUTO_PDF_SAMPLE) await writeFile(process.env.CAPTUTO_PDF_SAMPLE, bytes);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe('%PDF-');
    const doc = await PDFDocument.load(bytes);
    expect(doc.getTitle()).toBe('Démarrer avec Companion');
    expect(doc.getPageCount()).toBeGreaterThan(1);
    expect(doc.getPage(0).getWidth()).toBeCloseTo(595.28);
  });
  it('paginates long paragraphs and unbroken strings without failing', async () => {
    const bytes = await renderTutorialPdf({ title: 'Long guide', steps: [{ step_type: 'text', text_content: 'Read this', description: ('é'.repeat(250) + '\n').repeat(25) }] });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });
});
