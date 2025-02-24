-- Drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "unified_profiles_insert" ON profiles;
  DROP POLICY IF EXISTS "unified_profiles_select" ON profiles;
  DROP POLICY IF EXISTS "unified_profiles_update" ON profiles;
  DROP POLICY IF EXISTS "unified_activities_select" ON user_activities;
  DROP POLICY IF EXISTS "unified_activities_insert" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies for profiles
CREATE POLICY "allow_all_authenticated_insert"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "allow_all_authenticated_select"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_own_update"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    wallet_address = auth.jwt()->>'wallet_address'
  );

-- Create more permissive policies for activities
CREATE POLICY "allow_own_activities_select"
  ON user_activities
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

CREATE POLICY "allow_own_activities_insert"
  ON user_activities
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