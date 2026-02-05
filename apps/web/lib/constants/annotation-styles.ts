// Curated annotation color palette
export const ANNOTATION_COLORS = [
  { name: 'Red', value: '#e63946' },
  { name: 'Orange', value: '#f77f00' },
  { name: 'Yellow', value: '#fcbf49' },
  { name: 'Green', value: '#2a9d8f' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Dark', value: '#1e293b' },
] as const;

// Stroke width presets
export const STROKE_WIDTHS = [
  { label: 'Thin', value: 1, px: 2 },
  { label: 'Medium', value: 2, px: 3 },
  { label: 'Thick', value: 3, px: 5 },
] as const;

// Font size presets
export const FONT_SIZES = [
  { label: 'S', value: 14 },
  { label: 'M', value: 16 },
  { label: 'L', value: 20 },
  { label: 'XL', value: 24 },
] as const;

// Text background styles
export const TEXT_BACKGROUNDS = ['pill', 'rectangle', 'none'] as const;

// Default annotation style values
export const DEFAULT_ANNOTATION_STYLE = {
  color: '#e63946',
  strokeWidth: 2,
  fontSize: 16,
  opacity: 0.4,
  textBackground: 'pill' as const,
};

// Helper to get stroke pixel width from preset value
export function getStrokePx(strokeWidth: number | undefined): number {
  const found = STROKE_WIDTHS.find((s) => s.value === strokeWidth);
  return found ? found.px : 3; // default medium
}
