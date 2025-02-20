/*
  # Fix Profiles and Activities Tables

  1. Changes
    - Update profiles table structure
    - Fix RLS policies for profiles
    - Add proper constraints and indexes

  2. Security
    - Enable RLS on all tables
    - Add proper policies for authenticated users
    - Ensure proper access control
*/

-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can create a profile" ON profiles;
  DROP POLICY IF EXISTS "Users can view any profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile by wallet" ON profiles;
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Update profiles table structure
DO $$ 
BEGIN
  -- Modify wallet_address column
  ALTER TABLE profiles
    ALTER COLUMN wallet_address DROP NOT NULL,
    ALTER COLUMN wallet_address SET DEFAULT NULL;
  
  -- Drop and recreate unique constraint
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_wallet_address_key;
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_wallet_address_unique;
  ALTER TABLE profiles ADD CONSTRAINT profiles_wallet_address_unique UNIQUE (wallet_address);
EXCEPTION
  WHEN undefined_column THEN NULL;
  WHEN undefined_table THEN NULL;
END $$;

-- Create index on wallet_address if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_wallet_address'
  ) THEN
    CREATE INDEX idx_profiles_wallet_address ON profiles (wallet_address);
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Create new policies for profiles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid() OR
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
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
        user_id = auth.uid() OR
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      )
      WITH CHECK (
        user_id = auth.uid() OR
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      );
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
        user_id = auth.uid() OR
        wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
      );
  END IF;
END $$;

-- Update user_activities table
DO $$ 
BEGIN
  -- Update foreign key constraint
  ALTER TABLE user_activities
    DROP CONSTRAINT IF EXISTS user_activities_user_id_fkey,
    ADD CONSTRAINT user_activities_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES profiles(id) 
      ON DELETE CASCADE;

  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_activities' 
    AND indexname = 'idx_user_activities_user_id'
  ) THEN
    CREATE INDEX idx_user_activities_user_id ON user_activities (user_id);
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Update activity policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'Users can read own activities'
  ) THEN
    CREATE POLICY "Users can read own activities"
      ON user_activities
      FOR SELECT
      TO authenticated
      USING (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE user_id = auth.uid() OR
                wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
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
          WHERE user_id = auth.uid() OR
                wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address'
        )
      );
  END IF;
END $$;