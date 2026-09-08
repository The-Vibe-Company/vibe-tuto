import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import type { Annotation, StepType } from '@/lib/types/editor';
import { renderAnnotatedImage } from './annotations';

export interface PdfTutorial {
  title: string;
  description?: string | null;
  steps: { text_content: string | null; description?: string | null; step_type: StepType; annotations?: Annotation[] | null; image?: Buffer | null; loadImage?: () => Promise<Buffer> }[];
}

/** A4 guide with selectable text, pagination and flattened annotated screenshots. */
export async function renderTutorialPdf(tutorial: PdfTutorial): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // process.cwd() is apps/web in Next; root execution is supported for local tooling.
  const fontPath = path.join(process.cwd(), 'lib/render/fonts/NotoSans-Regular.ttf');
  const fontBytes = await readFile(fontPath).catch(() => readFile(path.join(process.cwd(), 'apps/web/lib/render/fonts/NotoSans-Regular.ttf')));
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(tutorial.title);
  doc.setCreator('Captuto');
  const ink = rgb(0.16, 0.15, 0.14), muted = rgb(0.40, 0.38, 0.35), coral = rgb(0.78, 0.24, 0.16);
  const margin = 48, pageWidth = 595.28, pageHeight = 841.89, contentWidth = pageWidth - margin * 2;
  let page: PDFPage;
  let y = 0;
  const newPage = () => {
    page = doc.addPage([pageWidth, pageHeight]);
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(0.99, 0.98, 0.96) });
    page.drawText('CAPTUTO / GUIDE', { x: margin, y: pageHeight - 33, font, size: 8, color: coral });
    y = pageHeight - 75;
  };
  const ensure = (height: number) => { if (y - height < 58) newPage(); };
  const paragraph = (text: string | null | undefined, size: number, color = ink) => {
    if (!text) return;
    const lineHeight = size * 1.5;
    // Wrap long URLs/words as well as prose, preserving explicit line breaks.
    for (const rawLine of text.replace(/\r/g, '').split('\n')) {
      let line = '';
      const draw = () => { ensure(lineHeight); page.drawText(line, { x: margin, y, font, size, color }); y -= lineHeight; line = ''; };
      for (const word of rawLine.split(/\s+/)) {
        if (line && font.widthOfTextAtSize(`${line} ${word}`, size) > contentWidth) draw();
        if (font.widthOfTextAtSize(word, size) <= contentWidth) { line += (line ? ' ' : '') + word; continue; }
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > contentWidth) draw();
          line += char;
        }
      }
      draw();
    }
    y -= 8;
  };
  newPage();
  paragraph(tutorial.title, 28);
  paragraph(tutorial.description, 11, muted);
  let number = 0;
  let imageBudget = 0;
  let pixelBudget = 0;
  for (const step of tutorial.steps) {
    ensure(80);
    if (step.step_type === 'divider') {
      page!.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: muted });
      y -= 24;
      continue;
    }
    if (step.step_type === 'heading') { paragraph(step.text_content, 20); continue; }
    let embedded: Awaited<ReturnType<typeof doc.embedPng>> | null = null;
    let imageWidth = 0, imageHeight = 0;
    if ((step.image || step.loadImage) && step.step_type === 'image') {
      const image = step.image || await step.loadImage!();
      imageBudget += image.byteLength;
      if (imageBudget > 100 * 1024 * 1024) throw new Error('PDF source images exceed 100 MB. Split this guide into smaller guides.');
      const rendered = await renderAnnotatedImage(image, step.annotations || []);
      const dimensions = await sharp(rendered).metadata();
      pixelBudget += (dimensions.width || 0) * (dimensions.height || 0);
      if (pixelBudget > 40_000_000) throw new Error('PDF exceeds the image budget. Split this guide into smaller guides.');
      embedded = await doc.embedPng(rendered);
      const scale = Math.min(contentWidth / embedded.width, 510 / embedded.height, 1);
      imageWidth = embedded.width * scale;
      imageHeight = embedded.height * scale;
      // Keep ordinary step captions with their image instead of orphaning them.
      const titleRows = Math.max(1, Math.ceil(font.widthOfTextAtSize(step.text_content || '', 15) / contentWidth));
      const descriptionRows = step.description ? Math.max(1, Math.ceil(font.widthOfTextAtSize(step.description, 10.5) / contentWidth)) : 0;
      const blockHeight = titleRows * 22.5 + descriptionRows * 15.75 + imageHeight + 44;
      if (blockHeight < pageHeight - 133) ensure(blockHeight);
    }
    number++;
    paragraph(`${String(number).padStart(2, '0')}  ${step.text_content || 'Step ' + number}`, 15);
    paragraph(step.description, 10.5, muted);
    if (embedded) {
      ensure(imageHeight + 20);
      page!.drawImage(embedded, { x: margin + (contentWidth - imageWidth) / 2, y: y - imageHeight, width: imageWidth, height: imageHeight });
      y -= imageHeight + 24;
    }
    y -= 10;
  }
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText('Created with Captuto', { x: margin, y: 28, size: 8, font, color: muted });
    p.drawText(`${i + 1} / ${pages.length}`, { x: pageWidth - margin - 35, y: 28, size: 8, font, color: muted });
  });
  return doc.save();
}
