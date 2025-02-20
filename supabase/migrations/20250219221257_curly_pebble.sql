/*
  # Fix RLS Policies and Table Structure

  1. Changes
    - Drop existing policies safely
    - Update profiles table structure
    - Create new policies with existence checks
    - Update indexes for performance

  2. Security
    - Enable RLS on all tables
    - Ensure proper access control
    - Maintain data integrity
*/

-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can read own activities" ON user_activities;
  DROP POLICY IF EXISTS "Users can create own activities" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

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
    AND policyname = 'Users can view profiles'
  ) THEN
    CREATE POLICY "Users can view profiles"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = user_id OR
        LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = user_id OR
        LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
      )
      WITH CHECK (
        auth.uid() = user_id OR
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
    AND policyname = 'Users can view own activities'
  ) THEN
    CREATE POLICY "Users can view own activities"
      ON user_activities
      FOR SELECT
      TO authenticated
      USING (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE auth.uid() = user_id OR
                LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'Users can create own activities'
  ) THEN
    CREATE POLICY "Users can create own activities"
      ON user_activities
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE auth.uid() = user_id OR
                LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
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