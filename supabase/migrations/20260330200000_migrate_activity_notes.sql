-- Migrate existing "note" activities to the notes table
INSERT INTO notes (content, deal_id, type, created_by, created_at, updated_at)
SELECT description, deal_id, 'note', created_by, created_at, created_at
FROM deal_activities
WHERE type = 'note';

-- Remove migrated note activities
DELETE FROM deal_activities WHERE type = 'note';
