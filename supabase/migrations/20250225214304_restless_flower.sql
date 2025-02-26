/*
  # Element Combinations History

  1. New Tables
    - `element_combination_history`
      - `id` (uuid, primary key)
      - `combination_id` (uuid, references element_combinations)
      - `element1` (text)
      - `element2` (text)
      - `result` (text)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references profiles)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create element combination history table
CREATE TABLE element_combination_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combination_id uuid REFERENCES element_combinations(id),
  element1 text NOT NULL,
  element2 text NOT NULL,
  result text NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE element_combination_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "View any combination history"
  ON element_combination_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Create own combination history"
  ON element_combination_history
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

-- Create indexes
CREATE INDEX idx_combination_history_user ON element_combination_history(user_id);
CREATE INDEX idx_combination_history_result ON element_combination_history(result);
CREATE INDEX idx_combination_history_created ON element_combination_history(created_at DESC);