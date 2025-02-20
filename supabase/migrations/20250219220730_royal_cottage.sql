/*
  # Update profiles table and policies

  1. Changes
    - Drop existing triggers and functions if they exist
    - Create profiles table with updated structure
    - Add RLS policies for web3 authentication
    - Add triggers for profile updates and new user creation

  2. Security
    - Enable RLS on profiles table
    - Add policies for profile creation and viewing
    - Add policy for profile updates based on wallet address
*/

-- Drop existing triggers and functions if they exist
DO $$ 
BEGIN
  -- Drop triggers first
  DROP TRIGGER IF EXISTS on_profile_update ON profiles;
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Then drop functions
  DROP FUNCTION IF EXISTS handle_profile_update();
  DROP FUNCTION IF EXISTS handle_new_user();
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  wallet_address text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now(),
  web3_provider text,
  chain_id text,
  nonce text
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for web3 authentication
CREATE POLICY "Anyone can create a profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view any profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile by wallet"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (wallet_address = current_setting('request.jwt.claims', true)::json->>'wallet_address');

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile updates
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_update();

-- Create function to automatically create profile for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();