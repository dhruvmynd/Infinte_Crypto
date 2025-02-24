-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "allow_all_authenticated_insert" ON profiles;
  DROP POLICY IF EXISTS "allow_all_authenticated_select" ON profiles;
  DROP POLICY IF EXISTS "allow_own_update" ON profiles;
  DROP POLICY IF EXISTS "allow_own_activities_select" ON user_activities;
  DROP POLICY IF EXISTS "allow_own_activities_insert" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create public policies for profiles
CREATE POLICY "public_select_profiles"
  ON profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_insert_profiles"
  ON profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "public_update_profiles"
  ON profiles
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Create public policies for activities
CREATE POLICY "public_select_activities"
  ON user_activities
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "public_insert_activities"
  ON user_activities
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles (wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON user_activities (user_id);