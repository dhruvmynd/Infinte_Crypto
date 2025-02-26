/*
  # Word Pack Purchases Table

  1. New Tables
    - `word_pack_purchases`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `pack_id` (text)
      - `amount` (integer)
      - `stripe_session_id` (text, unique)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to:
      - View their own purchases
      - Create new purchases
*/

-- Create word pack purchases table
CREATE TABLE IF NOT EXISTS word_pack_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id text NOT NULL,
  amount integer NOT NULL,
  stripe_session_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE word_pack_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own purchases"
  ON word_pack_purchases
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE auth.uid() = user_id OR
            wallet_address = auth.jwt()->>'wallet_address'
    )
  );

CREATE POLICY "Users can create own purchases"
  ON word_pack_purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE auth.uid() = user_id OR
            wallet_address = auth.jwt()->>'wallet_address'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_word_pack_purchases_user_id ON word_pack_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_word_pack_purchases_stripe_session ON word_pack_purchases (stripe_session_id);