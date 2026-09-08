import type { Tables } from '@/lib/supabase/types';

export type Tutorial = Tables<'tutorials'>;

// Source action type for timeline display (includes desktop types)
export type SourceActionType =
  | 'click'
  | 'navigation'
  | 'tab_change'
  | 'type'
  | 'keyboard_shortcut'
  | 'app_switch'
  | 'manual_marker';

// Desktop action types from the macOS step detector
export type DesktopActionType =
  | 'click'
  | 'type'
  | 'keyboard_shortcut'
  | 'app_switch'
  | 'url_navigation'
  | 'menu_selection'
  | 'drag'
  | 'scroll'
  | 'dialog_interaction'
  | 'manual_marker';

// Map desktop action_type to display action type
const DESKTOP_ACTION_MAP: Record<string, SourceActionType> = {
  click: 'click',
  type: 'type',
  keyboard_shortcut: 'keyboard_shortcut',
  app_switch: 'app_switch',
  url_navigation: 'navigation',
  menu_selection: 'click',
  drag: 'click',
  scroll: 'navigation',
  dialog_interaction: 'click',
  manual_marker: 'manual_marker',
};

// Helper to determine the action type of a source
export function getSourceActionType(source: Source | SourceWithSignedUrl): SourceActionType {
  // Desktop sources have action_type set directly
  if (source.action_type && source.action_type in DESKTOP_ACTION_MAP) {
    return DESKTOP_ACTION_MAP[source.action_type];
  }
  // Extension sources use click_type
  if (source.click_type === 'tab_change') return 'tab_change';
  if (source.click_type === 'navigation') return 'navigation';
  if (source.click_x != null && source.click_y != null) return 'click';
  return 'navigation';
}

// Helper to format a URL for display
export function formatSourceUrl(url: string | null): string {
  if (!url) return 'Unknown page';
  try {
    const parsed = new URL(url);
    const path = parsed.pathname !== '/' ? parsed.pathname : '';
    return parsed.hostname + path;
  } catch {
    return url;
  }
}

// Element info captured during click events
export interface ElementInfo {
  tag?: string;       // HTML tag name (e.g., "BUTTON", "A", "DIV")
  text?: string;      // Text content of element (e.g., "Settings", "Submit")
  id?: string;       // Element ID attribute
  className?: string; // Element class names
  tabTitle?: string; // Tab title for tab_change events
}

// ============================================
// SOURCE = Raw captured data from extension
// ============================================

// Base source from database
export interface Source {
  id: string;
  tutorial_id: string;
  order_index: number;
  screenshot_url: string | null;
  click_x: number | null;
  click_y: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  click_type: string | null;
  url: string | null;
  timestamp_start: number | null;
  element_info: ElementInfo | null;
  created_at: string;
  // Desktop recording fields
  app_bundle_id?: string | null;
  app_name?: string | null;
  window_title?: string | null;
  action_type?: string | null;
  auto_caption?: string | null;
  recording_id?: string | null;
}

// Source with signed URL for display
export interface SourceWithSignedUrl extends Omit<Source, 'element_info'> {
  signedScreenshotUrl: string | null;
  element_info?: ElementInfo | null;
}

// ============================================
// STEP = Authored tutorial content
// ============================================

// Step type for authored content
export type StepType = 'image' | 'text' | 'heading' | 'divider';

// Step with source data and signed URL for display
export interface StepWithSignedUrl {
  id: string;
  tutorial_id: string;
  source_id: string | null;
  order_index: number;
  text_content: string | null;
  description: string | null;
  step_type: StepType;
  annotations?: Annotation[] | null;
  created_at: string;
  // From joined source
  signedScreenshotUrl: string | null;
  source?: SourceWithSignedUrl | null;
  // Legacy fields (for compatibility with old components)
  click_x?: number | null;
  click_y?: number | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  element_info?: ElementInfo | null;
  url?: string | null;
  show_url?: boolean | null;
}

// Annotation types for screenshot markup
export type AnnotationType = 'circle' | 'rectangle' | 'arrow' | 'text' | 'blur' | 'highlight' | 'click-indicator' | 'numbered-callout';

export interface Annotation {
  id: string;
  type: AnnotationType;
  // Position relative (0-1) for responsive rendering
  x: number;
  y: number;
  // Dimensions for circle/blur/highlight (relative 0-1)
  width?: number;
  height?: number;
  // For arrows: end point (relative 0-1)
  endX?: number;
  endY?: number;
  // For text annotations
  content?: string;
  // Style options
  color?: string;
  strokeWidth?: number;      // 1=thin(2px), 2=medium(3px), 3=thick(5px)
  fontSize?: number;         // 14, 16, 20, 24
  opacity?: number;          // 0-1, for highlights
  textBackground?: 'pill' | 'rectangle' | 'none';
  calloutNumber?: number;    // For numbered-callout type
}
