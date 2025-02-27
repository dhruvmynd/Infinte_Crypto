/*
  # Add tokens column to profiles table

  1. Changes
     - Add tokens column to profiles table with default value of 0
     - Update first 100 profiles to have 100 tokens each
  
  2. Security
     - No changes to RLS policies needed as existing policies will apply to the new column
*/

-- Add tokens column to profiles table if it doesn't exist
DO $$ 
BEGIN
  ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS tokens INTEGER NOT NULL DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create index on tokens column
CREATE INDEX IF NOT EXISTS idx_profiles_tokens ON profiles(tokens);

-- Update first 100 profiles to have 100 tokens each
UPDATE profiles
SET tokens = 100
WHERE id IN (
  SELECT id
  FROM profiles
  ORDER BY created_at ASC
  LIMIT 100
);

-- Log the update
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count FROM profiles WHERE tokens = 100;
  RAISE NOTICE 'Updated % profiles with 100 tokens each', updated_count;
END $$;