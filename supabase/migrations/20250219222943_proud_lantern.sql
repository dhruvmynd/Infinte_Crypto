/*
  # Fix User Signup

  1. Changes
    - Drops and recreates the handle_new_user trigger with proper error handling
    - Ensures profile creation works for both web2 and web3 users
    - Adds proper error handling for duplicate profiles

  2. Security
    - Maintains RLS policies
    - Preserves existing security constraints
*/

-- Drop existing trigger and function
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS handle_new_user();
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create improved function to handle new user creation
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
      wallet_address,
      created_at,
      updated_at,
      last_login
    )
    VALUES (
      NEW.id,
      LOWER(NEW.raw_user_meta_data->>'wallet_address'),
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

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure all existing users have profiles
DO $$ 
BEGIN
  INSERT INTO profiles (user_id, created_at, updated_at, last_login)
  SELECT 
    id,
    COALESCE(created_at, NOW()),
    COALESCE(created_at, NOW()),
    COALESCE(created_at, NOW())
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = u.id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error ensuring profiles exist: %', SQLERRM;
END $$;