/*
  # Fix user feedback table policies

  1. Drop existing policies first
  2. Recreate policies with IF NOT EXISTS checks
  3. Ensure indexes exist
*/

-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can create feedback" ON user_feedback;
  DROP POLICY IF EXISTS "Anyone can view feedback" ON user_feedback;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create policies with IF NOT EXISTS checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_feedback' 
    AND policyname = 'Anyone can create feedback'
  ) THEN
    CREATE POLICY "Anyone can create feedback"
      ON user_feedback
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_feedback' 
    AND policyname = 'Anyone can view feedback'
  ) THEN
    CREATE POLICY "Anyone can view feedback"
      ON user_feedback
      FOR SELECT
      TO public
      USING (true);
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_feedback' 
    AND indexname = 'idx_user_feedback_user_id'
  ) THEN
    CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_feedback' 
    AND indexname = 'idx_user_feedback_category'
  ) THEN
    CREATE INDEX idx_user_feedback_category ON user_feedback(category);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_feedback' 
    AND indexname = 'idx_user_feedback_status'
  ) THEN
    CREATE INDEX idx_user_feedback_status ON user_feedback(status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_feedback' 
    AND indexname = 'idx_user_feedback_created_at'
  ) THEN
    CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);
  END IF;
END $$;