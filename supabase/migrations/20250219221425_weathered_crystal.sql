/*
  # Web3 Authentication and Profile Management

  1. Changes
    - Add web3-specific fields to profiles table
    - Update RLS policies for web3 authentication
    - Ensure proper indexes for performance
    - Add activity tracking support

  2. Security
    - Enable RLS on all tables
    - Add policies for web3 wallet authentication
    - Maintain data integrity with proper constraints
*/

-- Ensure proper table structure
DO $$ 
BEGIN
  -- Modify profiles table if needed
  ALTER TABLE profiles
    ALTER COLUMN wallet_address DROP NOT NULL,
    ALTER COLUMN wallet_address SET DEFAULT NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create new policies for profiles with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Web3 users can view profiles'
  ) THEN
    CREATE POLICY "Web3 users can view profiles"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Web3 users can insert own profile'
  ) THEN
    CREATE POLICY "Web3 users can insert own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (
        LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Web3 users can update own profile'
  ) THEN
    CREATE POLICY "Web3 users can update own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (
        LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
      )
      WITH CHECK (
        LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
      );
  END IF;
END $$;

-- Create new policies for activities with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'Web3 users can view own activities'
  ) THEN
    CREATE POLICY "Web3 users can view own activities"
      ON user_activities
      FOR SELECT
      TO authenticated
      USING (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'Web3 users can create own activities'
  ) THEN
    CREATE POLICY "Web3 users can create own activities"
      ON user_activities
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
        )
      );
  END IF;
END $$;

-- Create or update indexes
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