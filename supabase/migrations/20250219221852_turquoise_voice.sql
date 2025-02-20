/*
  # Update Web3 Authentication Policies

  1. Changes
    - Drop and recreate policies with unique names for web3 auth
    - Update policy conditions for web3 wallet authentication
    - Add performance indexes
    
  2. Security
    - Maintain RLS on all tables
    - Ensure proper access control for both web2 and web3 users
*/

-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Web3 users can create profile" ON profiles;
  DROP POLICY IF EXISTS "Web3 users can view profiles" ON profiles;
  DROP POLICY IF EXISTS "Web3 users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Web3 users can view own activities" ON user_activities;
  DROP POLICY IF EXISTS "Web3 users can create own activities" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create new policies with unique names for profiles
CREATE POLICY "Web3 auth - create profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (wallet_address IS NOT NULL AND user_id IS NULL) OR
    (auth.uid() = user_id)
  );

CREATE POLICY "Web3 auth - view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Web3 auth - update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    wallet_address IS NOT NULL AND
    LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
  )
  WITH CHECK (
    wallet_address IS NOT NULL AND
    LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
  );

-- Create new policies with unique names for activities
CREATE POLICY "Web3 auth - view own activities"
  ON user_activities
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE wallet_address IS NOT NULL AND
            LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
    )
  );

CREATE POLICY "Web3 auth - create own activities"
  ON user_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE wallet_address IS NOT NULL AND
            LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
    )
  );

-- Create or update indexes for better performance
DO $$
BEGIN
  -- For profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_web3_wallet_address'
  ) THEN
    CREATE INDEX idx_web3_wallet_address ON profiles (LOWER(wallet_address));
  END IF;

  -- For user_activities
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_activities' 
    AND indexname = 'idx_web3_user_activities'
  ) THEN
    CREATE INDEX idx_web3_user_activities ON user_activities (user_id);
  END IF;
END $$;