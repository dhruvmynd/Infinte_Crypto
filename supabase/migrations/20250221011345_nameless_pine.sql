-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "combinations_select" ON element_combinations;
  DROP POLICY IF EXISTS "combinations_insert" ON element_combinations;
  DROP POLICY IF EXISTS "combinations_update" ON element_combinations;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE element_combinations ENABLE ROW LEVEL SECURITY;

-- Create simplified policies with public access
CREATE POLICY "public_select_combinations"
  ON element_combinations
  FOR SELECT
  USING (true);

CREATE POLICY "public_insert_combinations"
  ON element_combinations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_update_combinations"
  ON element_combinations
  FOR UPDATE
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