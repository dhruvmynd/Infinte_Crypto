-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can create feedback" ON user_feedback;
  DROP POLICY IF EXISTS "Anyone can view feedback" ON user_feedback;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create user_activities table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'public_select_activities'
  ) THEN
    CREATE POLICY "public_select_activities"
      ON user_activities
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'public_insert_activities'
  ) THEN
    CREATE POLICY "public_insert_activities"
      ON user_activities
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Create public policies for user_feedback
CREATE POLICY "public_insert_feedback"
  ON user_feedback
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "public_select_feedback"
  ON user_feedback
  FOR SELECT
  TO public
  USING (true);