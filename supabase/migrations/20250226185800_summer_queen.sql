/*
  # Fix Row-Level Security Policies

  1. Changes
     - Drop existing RLS policies for profiles table
     - Create new public policies for profiles table
     - Fix authentication issues for profile creation
     - Add public access for unauthenticated users to create profiles
  
  2. Security
     - Allow public access for profile creation
     - Maintain security for profile updates
*/

-- Drop existing policies for profiles
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Create any profile" ON profiles;
  DROP POLICY IF EXISTS "View any profile" ON profiles;
  DROP POLICY IF EXISTS "Update own profile" ON profiles;
  DROP POLICY IF EXISTS "profiles_select" ON profiles;
  DROP POLICY IF EXISTS "profiles_insert" ON profiles;
  DROP POLICY IF EXISTS "profiles_update" ON profiles;
  DROP POLICY IF EXISTS "allow_authenticated_select_profiles" ON profiles;
  DROP POLICY IF EXISTS "allow_authenticated_insert_profiles" ON profiles;
  DROP POLICY IF EXISTS "allow_authenticated_update_profiles" ON profiles;
  DROP POLICY IF EXISTS "unified_profiles_insert" ON profiles;
  DROP POLICY IF EXISTS "unified_profiles_select" ON profiles;
  DROP POLICY IF EXISTS "unified_profiles_update" ON profiles;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new simplified policies for profiles
CREATE POLICY "public_select_profiles"
  ON profiles
  FOR SELECT
  USING (true);

CREATE POLICY "public_insert_profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_update_profiles"
  ON profiles
  FOR UPDATE
  USING (
    auth.uid() = user_id OR
    wallet_address = auth.jwt()->>'wallet_address'
  )
  WITH CHECK (
    auth.uid() = user_id OR
    wallet_address = auth.jwt()->>'wallet_address'
  );

-- Create function to handle profile updates with better error handling
CREATE OR REPLACE FUNCTION handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_profile_update: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle new user creation with better error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE user_id = NEW.id
  ) THEN
    -- Create new profile
    INSERT INTO profiles (
      user_id,
      email,
      created_at,
      updated_at,
      last_login
    )
    VALUES (
      NEW.id,
      NEW.email,
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle case where profile already exists
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error and continue
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_profile_update ON profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new triggers
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_update();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();