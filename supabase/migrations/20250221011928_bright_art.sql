-- Drop existing deferred constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_email_unique;

-- Add regular unique constraint for email (allowing nulls)
ALTER TABLE profiles
  ADD CONSTRAINT profiles_email_key UNIQUE NULLS NOT DISTINCT (email);

-- Add regular unique constraint for wallet_address (allowing nulls)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_wallet_address_unique,
  ADD CONSTRAINT profiles_wallet_address_key UNIQUE NULLS NOT DISTINCT (wallet_address);

-- Create function to handle profile upserts
CREATE OR REPLACE FUNCTION upsert_profile(
  p_user_id uuid,
  p_email text,
  p_wallet_address text,
  p_web3_provider text DEFAULT NULL,
  p_chain_id text DEFAULT NULL
) RETURNS profiles AS $$
DECLARE
  v_profile profiles;
BEGIN
  -- First try to find existing profile
  SELECT * INTO v_profile
  FROM profiles
  WHERE 
    (p_email IS NOT NULL AND email = p_email)
    OR (p_wallet_address IS NOT NULL AND LOWER(wallet_address) = LOWER(p_wallet_address))
    OR (p_user_id IS NOT NULL AND user_id = p_user_id)
  LIMIT 1;

  IF v_profile.id IS NOT NULL THEN
    -- Update existing profile
    UPDATE profiles
    SET
      user_id = COALESCE(p_user_id, user_id),
      email = COALESCE(p_email, email),
      wallet_address = CASE 
        WHEN p_wallet_address IS NOT NULL THEN LOWER(p_wallet_address)
        ELSE wallet_address
      END,
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
      CASE WHEN p_wallet_address IS NOT NULL THEN LOWER(p_wallet_address) ELSE NULL END,
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