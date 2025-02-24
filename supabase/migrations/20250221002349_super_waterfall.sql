/*
  # Add email column to profiles table

  1. Changes
    - Add email column to profiles table
    - Create index on email column for better query performance
*/

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS email text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index on email if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_email'
  ) THEN
    CREATE INDEX idx_profiles_email ON profiles (email);
  END IF;
END $$;