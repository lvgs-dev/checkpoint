-- The migration runner supplies one transaction for this file.
ALTER TYPE game_status ADD VALUE IF NOT EXISTS 'wishlist';
