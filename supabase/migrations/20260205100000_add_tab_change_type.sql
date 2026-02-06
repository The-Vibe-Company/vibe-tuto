-- Migration: Add 'tab_change' to click_type constraint
-- This allows capturing tab switch events during recording

ALTER TABLE sources DROP CONSTRAINT IF EXISTS sources_click_type_check;
ALTER TABLE sources ADD CONSTRAINT sources_click_type_check
  CHECK (click_type IN ('click', 'navigation', 'tab_change'));
