/*
  # Fix Profile and Activity Tables

  1. Changes
    - Drop existing policies safely
    - Create profiles table with proper structure
    - Create user_activities table with proper structure
    - Add necessary indexes
    - Set up proper RLS policies

  2. Security
    - Enable RLS on all tables
    - Add proper policies for both auth and wallet users
    - Ensure data integrity with proper constraints
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

-- Create or update profiles table
DO $$ 
BEGIN
  CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users ON DELETE CASCADE,
    wallet_address text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    last_login timestamptz DEFAULT now(),
    web3_provider text,
    chain_id text,
    CONSTRAINT wallet_address_unique UNIQUE (wallet_address)
  );
EXCEPTION
  WHEN duplicate_table THEN
    -- If table exists, ensure wallet_address is nullable
    ALTER TABLE profiles
      ALTER COLUMN wallet_address DROP NOT NULL,
      ALTER COLUMN wallet_address SET DEFAULT NULL;
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
END $$;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new policies for profiles
DO $$ 
BEGIN
  CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

  CREATE POLICY "Users can insert their own profile"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = user_id OR
      wallet_address = auth.jwt()->>'wallet_address'
    );

  CREATE POLICY "Users can update own profile"
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
END $$;

-- Create or update user_activities table
DO $$ 
BEGIN
  CREATE TABLE IF NOT EXISTS user_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Create index on user_id for activities if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'user_activities' 
    AND indexname = 'idx_user_activities_user_id'
  ) THEN
    CREATE INDEX idx_user_activities_user_id ON user_activities (user_id);
  END IF;
END $$;

-- Enable RLS on activities
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create new policies for activities
DO $$ 
BEGIN
  CREATE POLICY "Users can read own activities"
    ON user_activities
    FOR SELECT
    TO authenticated
    USING (
      user_id IN (
        SELECT id FROM profiles
        WHERE auth.uid() = user_id OR
              wallet_address = auth.jwt()->>'wallet_address'
      )
    );

  CREATE POLICY "Users can create own activities"
    ON user_activities
    FOR INSERT
    TO authenticated
    WITH CHECK (
      user_id IN (
        SELECT id FROM profiles
        WHERE auth.uid() = user_id OR
              wallet_address = auth.jwt()->>'wallet_address'
      )
    );
END $$;