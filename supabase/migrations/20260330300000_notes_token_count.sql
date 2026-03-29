-- Add token_count column to notes for exact Anthropic token counts
ALTER TABLE notes ADD COLUMN token_count integer;
