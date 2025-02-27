/*
  # Create user game stats table

  1. New Tables
    - `user_game_stats`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `basic_score` (integer)
      - `timed_score` (integer)
      - `category_score` (integer)
      - `one_vs_one_score` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `user_game_stats` table
    - Add policy for authenticated users to view their own stats
    - Add policy for authenticated users to update their own stats
*/

-- Create user game stats table
CREATE TABLE IF NOT EXISTS user_game_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  basic_score integer DEFAULT 0,
  timed_score integer DEFAULT 0,
  category_score integer DEFAULT 0,
  one_vs_one_score integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_game_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own game stats"
  ON user_game_stats
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE auth.uid() = user_id OR
            wallet_address = auth.jwt()->>'wallet_address'
    )
  );

CREATE POLICY "Users can update their own game stats"
  ON user_game_stats
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE auth.uid() = user_id OR
            wallet_address = auth.jwt()->>'wallet_address'
    )
  );

CREATE POLICY "Users can insert their own game stats"
  ON user_game_stats
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE auth.uid() = user_id OR
            wallet_address = auth.jwt()->>'wallet_address'
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_user_game_stats_user_id ON user_game_stats(user_id);

-- Create function to handle stats updates
CREATE OR REPLACE FUNCTION handle_game_stats_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stats updates
CREATE TRIGGER on_game_stats_update
  BEFORE UPDATE ON user_game_stats
  FOR EACH ROW
  EXECUTE FUNCTION handle_game_stats_update();