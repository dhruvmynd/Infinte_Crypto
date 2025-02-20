/*
  # Fix RLS Policies for Web2 and Web3 Authentication

  1. Changes
    - Simplify RLS policies to handle both web2 and web3 auth
    - Remove user_id requirement for web3 users
    - Allow profile creation without strict checks
    - Ensure proper access control for activities
    
  2. Security
    - Maintain RLS on all tables
    - Allow profile creation for both auth methods
    - Validate wallet address for web3 users
*/

-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Create profile" ON profiles;
  DROP POLICY IF EXISTS "View profiles" ON profiles;
  DROP POLICY IF EXISTS "Update own profile" ON profiles;
  DROP POLICY IF EXISTS "View own activities" ON user_activities;
  DROP POLICY IF EXISTS "Create own activities" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for profiles
CREATE POLICY "Create any profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "View any profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- For web2 users
    auth.uid() = user_id
    OR
    -- For web3 users
    (
      wallet_address IS NOT NULL AND
      wallet_address = auth.jwt()->>'wallet_address'
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR
    (
      wallet_address IS NOT NULL AND
      wallet_address = auth.jwt()->>'wallet_address'
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
        wallet_address = auth.jwt()->>'wallet_address'
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
        wallet_address = auth.jwt()->>'wallet_address'
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
    CREATE INDEX idx_profiles_wallet_address ON profiles (wallet_address);
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