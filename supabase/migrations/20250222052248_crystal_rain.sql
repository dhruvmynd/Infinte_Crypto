-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "public_select_profiles" ON profiles;
  DROP POLICY IF EXISTS "public_insert_profiles" ON profiles;
  DROP POLICY IF EXISTS "public_update_profiles" ON profiles;
  DROP POLICY IF EXISTS "public_select_activities" ON user_activities;
  DROP POLICY IF EXISTS "public_insert_activities" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create simplified policies for profiles
CREATE POLICY "allow_authenticated_select_profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_authenticated_insert_profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_authenticated_update_profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create simplified policies for activities
CREATE POLICY "allow_authenticated_select_activities"
  ON user_activities
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_authenticated_insert_activities"
  ON user_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON profiles (wallet_address);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON user_activities (user_id);

-- Add function to handle profile updates
CREATE OR REPLACE FUNCTION handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS on_profile_update ON profiles;
CREATE TRIGGER on_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_update();