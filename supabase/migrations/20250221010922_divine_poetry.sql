/*
  # Add element combinations tracking

  1. New Tables
    - `element_combinations`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `count` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `element_combinations` table
    - Add policies for authenticated users to read and update combinations
*/

-- Create element combinations table
CREATE TABLE IF NOT EXISTS element_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE element_combinations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view combinations"
  ON element_combinations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert combinations"
  ON element_combinations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update combinations"
  ON element_combinations
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create index on name
CREATE INDEX IF NOT EXISTS idx_element_combinations_name ON element_combinations (name);

-- Create function to handle combination updates
CREATE OR REPLACE FUNCTION handle_combination_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for combination updates
CREATE TRIGGER on_combination_update
  BEFORE UPDATE ON element_combinations
  FOR EACH ROW
  EXECUTE FUNCTION handle_combination_update();