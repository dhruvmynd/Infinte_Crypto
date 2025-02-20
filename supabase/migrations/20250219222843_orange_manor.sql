/*
  # Unified Auth Policies

  1. Changes
    - Safely drops all existing policies
    - Creates unified policies for both web2 and web3 authentication
    - Adds performance indexes
    - Ensures idempotent operations

  2. Security
    - Enables RLS on all tables
    - Creates policies for insert, select, and update operations
    - Enforces proper authentication checks
*/

-- Drop ALL existing policies safely
DO $$ 
BEGIN
  -- Drop profile policies
  DROP POLICY IF EXISTS "profiles_insert" ON profiles;
  DROP POLICY IF EXISTS "profiles_select" ON profiles;
  DROP POLICY IF EXISTS "profiles_update" ON profiles;
  DROP POLICY IF EXISTS "Web3 auth - create profile" ON profiles;
  DROP POLICY IF EXISTS "Web3 auth - view profiles" ON profiles;
  DROP POLICY IF EXISTS "Web3 auth - update own profile" ON profiles;
  DROP POLICY IF EXISTS "Create any profile" ON profiles;
  DROP POLICY IF EXISTS "View any profile" ON profiles;
  DROP POLICY IF EXISTS "Update own profile" ON profiles;
  
  -- Drop activity policies
  DROP POLICY IF EXISTS "activities_select" ON user_activities;
  DROP POLICY IF EXISTS "activities_insert" ON user_activities;
  DROP POLICY IF EXISTS "Web3 auth - view own activities" ON user_activities;
  DROP POLICY IF EXISTS "Web3 auth - create own activities" ON user_activities;
  DROP POLICY IF EXISTS "View own activities" ON user_activities;
  DROP POLICY IF EXISTS "Create own activities" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create new unified policies for profiles with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'unified_profiles_insert'
  ) THEN
    CREATE POLICY "unified_profiles_insert"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (
        auth.uid() = user_id OR
        wallet_address = auth.jwt()->>'wallet_address'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'unified_profiles_select'
  ) THEN
    CREATE POLICY "unified_profiles_select"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'unified_profiles_update'
  ) THEN
    CREATE POLICY "unified_profiles_update"
      ON profiles
      FOR UPDATE
      TO authenticated
      USING (
        auth.uid() = user_id OR
        wallet_address = auth.jwt()->>'wallet_address'
      )
      WITH CHECK (
        auth.uid() = user_id OR
        wallet_address = auth.jwt()->>'wallet_address'
      );
  END IF;
END $$;

-- Create new unified policies for activities with existence checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'unified_activities_select'
  ) THEN
    CREATE POLICY "unified_activities_select"
      ON user_activities
      FOR SELECT
      TO authenticated
      USING (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE auth.uid() = user_id OR
                wallet_address = auth.jwt()->>'wallet_address'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'unified_activities_insert'
  ) THEN
    CREATE POLICY "unified_activities_insert"
      ON user_activities
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE auth.uid() = user_id OR
                wallet_address = auth.jwt()->>'wallet_address'
        )
      );
  END IF;
END $$;

-- Create or update indexes for better performance
DO $$
BEGIN
  -- For profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_unified_profiles_wallet'
  ) THEN
    CREATE INDEX idx_unified_profiles_wallet ON profiles (wallet_address);
  END IF;

  -- For user_activities
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_activities' 
    AND indexname = 'idx_unified_activities_user'
  ) THEN
    CREATE INDEX idx_unified_activities_user ON user_activities (user_id);
  END IF;
END $$;