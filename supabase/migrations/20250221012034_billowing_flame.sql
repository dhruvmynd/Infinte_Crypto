/*
  # Fix Profile Duplicates and Upsert Logic

  1. Changes
    - Drop existing wallet address constraint
    - Add new case-insensitive unique constraint
    - Update upsert function to handle duplicates properly
    - Add function to normalize wallet addresses

  2. Security
    - Maintain RLS policies
    - Ensure data integrity during updates
*/

-- Create function to normalize wallet addresses
CREATE OR REPLACE FUNCTION normalize_wallet_address(addr text)
RETURNS text AS $$
BEGIN
  RETURN LOWER(TRIM(addr));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop existing constraints
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_wallet_address_key;

-- Add new case-insensitive unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_wallet_address_unique 
  ON profiles (normalize_wallet_address(wallet_address))
  WHERE wallet_address IS NOT NULL;

-- Update upsert function to handle duplicates properly
CREATE OR REPLACE FUNCTION upsert_profile(
  p_user_id uuid,
  p_email text,
  p_wallet_address text,
  p_web3_provider text DEFAULT NULL,
  p_chain_id text DEFAULT NULL
) RETURNS profiles AS $$
DECLARE
  v_profile profiles;
  v_normalized_wallet text;
BEGIN
  -- Normalize wallet address
  v_normalized_wallet := CASE 
    WHEN p_wallet_address IS NOT NULL THEN normalize_wallet_address(p_wallet_address)
    ELSE NULL
  END;

  -- First try to find existing profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE 
    (p_user_id IS NOT NULL AND user_id = p_user_id)
    OR (p_email IS NOT NULL AND email = p_email)
    OR (v_normalized_wallet IS NOT NULL AND normalize_wallet_address(wallet_address) = v_normalized_wallet)
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_profile.id IS NOT NULL THEN
    -- Update existing profile
    UPDATE profiles
    SET
      user_id = COALESCE(p_user_id, user_id),
      email = COALESCE(p_email, email),
      wallet_address = COALESCE(v_normalized_wallet, wallet_address),
      web3_provider = COALESCE(p_web3_provider, web3_provider),
      chain_id = COALESCE(p_chain_id, chain_id),
      last_login = now(),
      updated_at = now()
    WHERE id = v_profile.id
    RETURNING * INTO v_profile;
  ELSE
    -- Insert new profile
    INSERT INTO profiles (
      user_id,
      email,
      wallet_address,
      web3_provider,
      chain_id,
      created_at,
      updated_at,
      last_login
    )
    VALUES (
      p_user_id,
      p_email,
      v_normalized_wallet,
      p_web3_provider,
      p_chain_id,
      now(),
      now(),
      now()
    )
    RETURNING * INTO v_profile;
  END IF;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql;