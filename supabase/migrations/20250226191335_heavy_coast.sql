-- Create simple table for word pack purchases
CREATE TABLE IF NOT EXISTS word_pack_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  pack_id text NOT NULL,
  amount integer NOT NULL,
  price numeric(10,2) NOT NULL,
  status text DEFAULT 'pending',
  stripe_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE word_pack_purchases ENABLE ROW LEVEL SECURITY;

-- Create simple policy
CREATE POLICY "all_access" ON word_pack_purchases
  FOR ALL USING (true);