/*
  # Insert existing users into profiles

  1. Changes
    - Insert profiles for existing users who don't have one
    - Update existing profiles with wallet addresses if they exist
    - Ensure all auth.users have corresponding profiles

  2. Security
    - Maintains existing RLS policies
    - No changes to table structure or permissions
*/

-- Insert profiles for existing users who don't have one
DO $$ 
BEGIN
  INSERT INTO profiles (user_id)
  SELECT id 
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1 
    FROM profiles p 
    WHERE p.user_id = u.id
  );
END $$;

-- Update profiles with wallet addresses from user metadata if available
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT 
      id,
      raw_user_meta_data->>'wallet_address' as wallet_address,
      raw_user_meta_data->>'web3_provider' as web3_provider,
      raw_user_meta_data->>'chain_id' as chain_id
    FROM auth.users 
    WHERE raw_user_meta_data->>'wallet_address' IS NOT NULL
  LOOP
    UPDATE profiles 
    SET 
      wallet_address = LOWER(user_record.wallet_address),
      web3_provider = COALESCE(user_record.web3_provider, 'unknown'),
      chain_id = user_record.chain_id,
      updated_at = now()
    WHERE user_id = user_record.id
    AND (
      wallet_address IS NULL 
      OR wallet_address != LOWER(user_record.wallet_address)
    );
  END LOOP;
END $$;