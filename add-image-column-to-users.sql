-- Add image column to users table if it doesn't exist
-- Run this in Supabase SQL Editor

-- Check if column exists, if not, add it
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users' 
    AND column_name = 'image'
  ) THEN
    ALTER TABLE users 
    ADD COLUMN image TEXT;
    
    RAISE NOTICE 'Column image added to users table';
  ELSE
    RAISE NOTICE 'Column image already exists in users table';
  END IF;
END $$;

-- Verify column was added
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
  AND column_name = 'image';

