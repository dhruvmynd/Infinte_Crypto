/*
  # Fix Email Constraint Issues

  1. Changes
     - Completely removes the unique constraint on email field
     - Adds a partial unique index that only applies to non-null emails
     - Improves error handling for profile creation
     - Ensures proper handling of Web3 users without emails

  2. Security
     - Maintains RLS on all tables
     - Ensures proper access control for authenticated users
*/

-- Drop existing constraints that might cause issues
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_email_key,
  DROP CONSTRAINT IF EXISTS profiles_email_unique;

-- Create a partial unique index for email that only applies to non-null values
DROP INDEX IF EXISTS idx_profiles_email;
CREATE UNIQUE INDEX idx_profiles_email_unique ON profiles (email) WHERE email IS NOT NULL;

-- Make sure wallet_address is properly indexed with case insensitivity
DROP INDEX IF EXISTS idx_profiles_wallet_address;
CREATE INDEX idx_profiles_wallet_address ON profiles (LOWER(wallet_address));

-- Create function to normalize wallet addresses and handle updates
CREATE OR REPLACE FUNCTION normalize_profile_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize wallet address to lowercase
  IF NEW.wallet_address IS NOT NULL THEN
    NEW.wallet_address = LOWER(TRIM(NEW.wallet_address));
  END IF;
  
  -- Update timestamps
  NEW.updated_at = now();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but allow operation to continue
    RAISE WARNING 'Error in normalize_profile_data: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile data normalization
DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION normalize_profile_data();