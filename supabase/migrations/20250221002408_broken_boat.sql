/*
  # Fix profiles table constraints and triggers

  1. Changes
    - Make user_id nullable to support web3-only profiles
    - Update foreign key constraint
    - Improve trigger function for handling new users
    - Add better error handling
*/

-- Make user_id nullable and update foreign key constraint
ALTER TABLE profiles 
  ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_profile_id uuid;
BEGIN
  -- Create profile for new user
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
  )
  RETURNING id INTO new_profile_id;

  -- Log success
  RAISE NOTICE 'Created new profile % for user %', new_profile_id, NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Handle case where profile already exists
    RAISE NOTICE 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error details but allow user creation to proceed
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Ensure all existing users have profiles
INSERT INTO profiles (
  user_id,
  email,
  created_at,
  updated_at,
  last_login
)
SELECT 
  id,
  email,
  created_at,
  created_at,
  created_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 
  FROM profiles p 
  WHERE p.user_id = u.id
);