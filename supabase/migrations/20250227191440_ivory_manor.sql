-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "public_select_game_stats" ON user_game_stats;
  DROP POLICY IF EXISTS "public_insert_game_stats" ON user_game_stats;
  DROP POLICY IF EXISTS "public_update_game_stats" ON user_game_stats;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create more permissive policies for game stats
CREATE POLICY "public_select_game_stats"
  ON user_game_stats
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_insert_game_stats"
  ON user_game_stats
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "public_update_game_stats"
  ON user_game_stats
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

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