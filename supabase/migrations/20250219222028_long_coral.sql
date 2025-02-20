/*
  # Fix RLS Policies for Web2 and Web3 Authentication

  1. Changes
    - Simplify RLS policies to handle both web2 and web3 auth
    - Allow profile creation for both auth methods
    - Ensure proper access control for activities
    
  2. Security
    - Maintain RLS on all tables
    - Allow profile creation without strict user_id check
    - Validate wallet address for web3 users
    - Ensure proper access control
*/

-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow profile creation" ON profiles;
  DROP POLICY IF EXISTS "Allow profile viewing" ON profiles;
  DROP POLICY IF EXISTS "Allow profile updates" ON profiles;
  DROP POLICY IF EXISTS "Allow activity viewing" ON user_activities;
  DROP POLICY IF EXISTS "Allow activity creation" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for profiles
CREATE POLICY "Create profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "View profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow web2 users to update their profiles
    auth.uid() = user_id
    OR
    -- Allow web3 users to update their profiles
    (
      wallet_address IS NOT NULL AND
      LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (
      wallet_address IS NOT NULL AND
      LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
    )
  );

-- Create simplified policies for activities
CREATE POLICY "View own activities"
  ON user_activities
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE user_id = auth.uid()
      OR (
        wallet_address IS NOT NULL AND
        LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
      )
    )
  );

CREATE POLICY "Create own activities"
  ON user_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE user_id = auth.uid()
      OR (
        wallet_address IS NOT NULL AND
        LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
      )
    )
  );

-- Create or update indexes for better performance
DO $$
BEGIN
  -- For profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_wallet_address'
  ) THEN
    CREATE INDEX idx_profiles_wallet_address ON profiles (LOWER(wallet_address));
  END IF;

  -- For user_activities
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_activities' 
    AND indexname = 'idx_user_activities_user_id'
  ) THEN
    CREATE INDEX idx_user_activities_user_id ON user_activities (user_id);
  END IF;
END $$;