-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view their own game stats" ON user_game_stats;
  DROP POLICY IF EXISTS "Users can update their own game stats" ON user_game_stats;
  DROP POLICY IF EXISTS "Users can insert their own game stats" ON user_game_stats;
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