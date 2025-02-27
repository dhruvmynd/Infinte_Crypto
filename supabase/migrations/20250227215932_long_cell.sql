/*
  # Create user_elements table

  1. New Tables
    - `user_elements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `element_data` (jsonb, stores element information)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  2. Security
    - Enable RLS on `user_elements` table
    - Add policy for public access
*/

-- Create user_elements table
CREATE TABLE IF NOT EXISTS user_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  element_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_elements ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "public_select_user_elements"
  ON user_elements
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_insert_user_elements"
  ON user_elements
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "public_update_user_elements"
  ON user_elements
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "public_delete_user_elements"
  ON user_elements
  FOR DELETE
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_user_elements_user_id ON user_elements(user_id);
CREATE INDEX idx_user_elements_created_at ON user_elements(created_at);

-- Create function to handle element updates
CREATE OR REPLACE FUNCTION handle_element_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for element updates
CREATE TRIGGER on_element_update
  BEFORE UPDATE ON user_elements
  FOR EACH ROW
  EXECUTE FUNCTION handle_element_update();