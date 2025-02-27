/*
  # Stripe Integration Schema

  1. New Tables
    - `user_tokens` - Tracks token balances for users
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `balance` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `token_transactions` - Records token usage and purchases
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `amount` (integer)
      - `transaction_type` (text)
      - `description` (text)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create user_tokens table
CREATE TABLE IF NOT EXISTS user_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create token_transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  transaction_type text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for user_tokens
CREATE POLICY "Users can view own tokens"
  ON user_tokens
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

CREATE POLICY "Users can update own tokens"
  ON user_tokens
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id 
      FROM profiles 
      WHERE auth.uid() = user_id OR
            wallet_address = auth.jwt()->>'wallet_address'
    )
  );

CREATE POLICY "Users can insert own tokens"
  ON user_tokens
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

-- Create policies for token_transactions
CREATE POLICY "Users can view own transactions"
  ON token_transactions
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

CREATE POLICY "Users can insert own transactions"
  ON token_transactions
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

-- Create function to update token balance
CREATE OR REPLACE FUNCTION update_token_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has a token balance record
  IF NOT EXISTS (
    SELECT 1 FROM user_tokens WHERE user_id = NEW.user_id
  ) THEN
    -- Create a new token balance record
    INSERT INTO user_tokens (user_id, balance)
    VALUES (NEW.user_id, CASE WHEN NEW.transaction_type = 'purchase' THEN NEW.amount ELSE 0 END);
  ELSE
    -- Update existing token balance
    UPDATE user_tokens
    SET 
      balance = CASE 
        WHEN NEW.transaction_type = 'purchase' THEN balance + NEW.amount
        WHEN NEW.transaction_type = 'usage' THEN balance - NEW.amount
        ELSE balance
      END,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for token transactions
CREATE TRIGGER on_token_transaction
  AFTER INSERT ON token_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_token_balance();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_id ON user_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions (transaction_type);