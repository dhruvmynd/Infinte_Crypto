/*
  # Fix duplicate profiles issue

  1. Changes
    - Add unique constraint on email column
    - Clean up duplicate profiles
    - Improve profile handling
*/

-- First, keep only the most recent profile for each email
WITH duplicates AS (
  SELECT id,
         email,
         created_at,
         ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at DESC) as rn
  FROM profiles
  WHERE email IS NOT NULL
)
DELETE FROM profiles
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Add unique constraint on email (allowing nulls for web3 users)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_email_unique;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_email_unique UNIQUE (email)
  DEFERRABLE INITIALLY DEFERRED;