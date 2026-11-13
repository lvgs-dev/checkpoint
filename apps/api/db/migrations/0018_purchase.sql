-- The migration runner supplies one transaction for this file.
ALTER TABLE library_entry ADD COLUMN IF NOT EXISTS purchased_at timestamptz;
