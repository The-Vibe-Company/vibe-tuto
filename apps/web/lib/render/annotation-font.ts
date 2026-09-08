import { readFile } from 'node:fs/promises';
import path from 'node:path';
import fontkit, { type Font } from '@pdf-lib/fontkit';

let fontPromise: Promise<Font> | undefined;
export function annotationFont() {
  fontPromise ??= readFile(path.join(process.cwd(), 'lib/render/fonts/NotoSans-Regular.ttf'))
    .catch(() => readFile(path.join(process.cwd(), 'apps/web/lib/render/fonts/NotoSans-Regular.ttf')))
    .then(bytes => fontkit.create(bytes));
  return fontPromise;
}

/** Use the same bundled font as Canvas; glyph paths remove platform/fontconfig differences. */
export function svgText(font: Font, text: string, size: number, x: number, baseline: number, color: string) {
  const run = font.layout(text);
  const scale = size / font.unitsPerEm;
  let cursor = 0;
  const paths = run.glyphs.map((glyph, index) => {
    const position = run.positions[index];
    const result = `<path transform="translate(${x + (cursor + position.xOffset) * scale} ${baseline - position.yOffset * scale}) scale(${scale} ${-scale})" d="${glyph.path.toSVG()}"/>`;
    cursor += position.xAdvance;
    return result;
  }).join('');
  return { width: run.advanceWidth * scale, markup: `<g fill="${color}">${paths}</g>` };
}
