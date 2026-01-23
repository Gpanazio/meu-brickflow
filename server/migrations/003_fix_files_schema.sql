-- Fix files table to use path instead of data
ALTER TABLE files DROP COLUMN IF EXISTS data;
ALTER TABLE files ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE files ADD COLUMN IF NOT EXISTS url TEXT; -- Optional public URL if served statically
