/*
  # Fix Web3 Profile Creation

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies specifically for web3 authentication
    - Add case-insensitive wallet address comparison
    - Allow profile creation without user_id for web3 users
    
  2. Security
    - Enable RLS on all tables
    - Ensure proper access control for web3 users
    - Add policies for profile and activity management
*/

-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can create profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view any profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view own activities" ON user_activities;
  DROP POLICY IF EXISTS "Users can create own activities" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create new policies for profiles
CREATE POLICY "Web3 users can create profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (wallet_address IS NOT NULL AND user_id IS NULL) OR
    (auth.uid() = user_id)
  );

CREATE POLICY "Anyone can view profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Web3 users can update own profile"
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

-- Create new policies for activities
CREATE POLICY "Web3 users can view own activities"
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

CREATE POLICY "Web3 users can create own activities"
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
    AND indexname = 'idx_profiles_wallet_address_lower'
  ) THEN
    CREATE INDEX idx_profiles_wallet_address_lower ON profiles (LOWER(wallet_address));
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