-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "allow_authenticated_select_profiles" ON profiles;
  DROP POLICY IF EXISTS "allow_authenticated_insert_profiles" ON profiles;
  DROP POLICY IF EXISTS "allow_authenticated_update_profiles" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- First, clean up any duplicate null wallet_address entries
WITH duplicates AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY COALESCE(wallet_address, 'NULL') ORDER BY created_at DESC) as rn
  FROM profiles
  WHERE wallet_address IS NULL
)
DELETE FROM profiles
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Add unique constraints for user_id and wallet_address
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_user_id_key,
  DROP CONSTRAINT IF EXISTS profiles_wallet_address_key;

-- Add unique constraint that treats NULL values as distinct
ALTER TABLE profiles
  ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id),
  ADD CONSTRAINT profiles_wallet_address_key UNIQUE (wallet_address);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles (wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simplified policies
CREATE POLICY "profiles_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "profiles_update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    wallet_address = auth.jwt()->>'wallet_address'
  );

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_update();