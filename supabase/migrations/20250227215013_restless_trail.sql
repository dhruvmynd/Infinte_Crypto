-- Create token transactions table if it doesn't exist
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

-- Create policies with IF NOT EXISTS checks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'token_transactions' 
    AND policyname = 'public_select_token_transactions'
  ) THEN
    CREATE POLICY "public_select_token_transactions"
      ON token_transactions
      FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'token_transactions' 
    AND policyname = 'public_insert_token_transactions'
  ) THEN
    CREATE POLICY "public_insert_token_transactions"
      ON token_transactions
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END $$;

-- Create indexes with IF NOT EXISTS checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'token_transactions' 
    AND indexname = 'idx_token_transactions_user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'token_transactions' 
    AND indexname = 'idx_token_transactions_created_at'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(created_at DESC);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'token_transactions' 
    AND indexname = 'idx_token_transactions_type'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
  END IF;
END $$;