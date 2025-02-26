-- Drop existing policies safely
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "purchases_select" ON word_pack_purchases;
  DROP POLICY IF EXISTS "purchases_insert" ON word_pack_purchases;
  DROP POLICY IF EXISTS "purchases_update" ON word_pack_purchases;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Drop existing table if it exists
DROP TABLE IF EXISTS word_pack_purchases;

-- Create word pack purchases table
CREATE TABLE word_pack_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  pack_id text NOT NULL,
  amount integer NOT NULL,
  price numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE word_pack_purchases ENABLE ROW LEVEL SECURITY;

-- Create new policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'word_pack_purchases' 
    AND policyname = 'purchases_select'
  ) THEN
    CREATE POLICY "purchases_select"
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'word_pack_purchases' 
    AND policyname = 'purchases_insert'
  ) THEN
    CREATE POLICY "purchases_insert"
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
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'word_pack_purchases' 
    AND policyname = 'purchases_update'
  ) THEN
    CREATE POLICY "purchases_update"
      ON word_pack_purchases
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
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_word_pack_purchases_user_id ON word_pack_purchases (user_id);
CREATE INDEX IF NOT EXISTS idx_word_pack_purchases_status ON word_pack_purchases (status);

-- Create function to handle purchase updates
CREATE OR REPLACE FUNCTION handle_purchase_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for purchase updates
DROP TRIGGER IF EXISTS on_purchase_update ON word_pack_purchases;
CREATE TRIGGER on_purchase_update
  BEFORE UPDATE ON word_pack_purchases
  FOR EACH ROW
  EXECUTE FUNCTION handle_purchase_update();