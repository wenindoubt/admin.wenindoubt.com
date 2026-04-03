ALTER TABLE notes ADD COLUMN external_id text;
CREATE UNIQUE INDEX idx_notes_external_id ON notes (external_id) WHERE external_id IS NOT NULL;
