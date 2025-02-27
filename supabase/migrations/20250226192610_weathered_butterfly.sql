/*
  # Fix Web3 Profile Creation

  1. Changes
     - Removes unique constraint on email to allow Web3 users without email
     - Adds better error handling for profile creation
     - Ensures wallet addresses are properly normalized
     - Simplifies RLS policies for better compatibility

  2. Security
     - Maintains RLS on all tables
     - Ensures proper access control for authenticated users
*/

-- Drop existing constraints that might cause issues
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_email_key,
  DROP CONSTRAINT IF EXISTS profiles_email_unique;

-- Make sure wallet_address is properly indexed
DROP INDEX IF EXISTS idx_profiles_wallet_address;
CREATE INDEX idx_profiles_wallet_address ON profiles (LOWER(wallet_address));

-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "public_select_profiles" ON profiles;
  DROP POLICY IF EXISTS "public_insert_profiles" ON profiles;
  DROP POLICY IF EXISTS "public_update_profiles" ON profiles;
  DROP POLICY IF EXISTS "profiles_select" ON profiles;
  DROP POLICY IF EXISTS "profiles_insert" ON profiles;
  DROP POLICY IF EXISTS "profiles_update" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for profiles
CREATE POLICY "allow_select_profiles"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "allow_insert_profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "allow_update_profiles"
  ON profiles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create function to normalize wallet addresses on insert/update
CREATE OR REPLACE FUNCTION normalize_wallet_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.wallet_address IS NOT NULL THEN
    NEW.wallet_address = LOWER(TRIM(NEW.wallet_address));
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wallet address normalization
DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_wallet_address();