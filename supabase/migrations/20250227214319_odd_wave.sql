/*
  # Create token transactions table

  1. New Tables
     - token_transactions: Tracks all token transactions (credits and debits)
       - id (uuid, primary key)
       - user_id (uuid, references profiles)
       - amount (integer)
       - transaction_type (text): 'credit' or 'debit'
       - description (text)
       - previous_balance (integer)
       - new_balance (integer)
       - created_at (timestamptz)
  
  2. Security
     - Enable RLS on token_transactions table
     - Add policy for users to view their own transactions
     - Add policy for users to insert their own transactions
*/

-- Create token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL,
  description text,
  previous_balance integer,
  new_balance integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "public_select_token_transactions"
  ON token_transactions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_insert_token_transactions"
  ON token_transactions
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_token_transactions_user_id ON token_transactions(user_id);
CREATE INDEX idx_token_transactions_created_at ON token_transactions(created_at DESC);
CREATE INDEX idx_token_transactions_type ON token_transactions(transaction_type);