-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view combinations" ON element_combinations;
  DROP POLICY IF EXISTS "Authenticated users can insert combinations" ON element_combinations;
  DROP POLICY IF EXISTS "Authenticated users can update combinations" ON element_combinations;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Ensure table exists with correct structure
CREATE TABLE IF NOT EXISTS element_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  count integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE element_combinations ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies
CREATE POLICY "combinations_select"
  ON element_combinations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "combinations_insert"
  ON element_combinations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "combinations_update"
  ON element_combinations
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create index on name if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'element_combinations' 
    AND indexname = 'idx_element_combinations_name'
  ) THEN
    CREATE INDEX idx_element_combinations_name ON element_combinations (name);
  END IF;
END $$;

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION handle_combination_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_combination_update'
  ) THEN
    CREATE TRIGGER on_combination_update
      BEFORE UPDATE ON element_combinations
      FOR EACH ROW
      EXECUTE FUNCTION handle_combination_update();
  END IF;
END $$;