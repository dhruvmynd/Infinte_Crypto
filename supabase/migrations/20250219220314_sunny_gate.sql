/*
  # Add User Activities Table

  1. New Tables
    - `user_activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `activity_type` (text)
      - `details` (jsonb)
      - `created_at` (timestamptz)

  2. Security
    - Drop existing policies if they exist
    - Create new policies for user activities table
*/

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own activities" ON user_activities;
  DROP POLICY IF EXISTS "Users can create own activities" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create user_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  activity_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Create policies with IF NOT EXISTS
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'Users can read own activities'
  ) THEN
    CREATE POLICY "Users can read own activities"
      ON user_activities
      FOR SELECT
      TO authenticated
      USING (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_activities' 
    AND policyname = 'Users can create own activities'
  ) THEN
    CREATE POLICY "Users can create own activities"
      ON user_activities
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id IN (
          SELECT id 
          FROM profiles 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;