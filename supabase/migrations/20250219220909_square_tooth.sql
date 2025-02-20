/*
  # User Activities Table and Policies

  1. Changes
    - Create user_activities table for tracking user actions
    - Add RLS policies for secure access
    - Link activities to profiles and user IDs

  2. Security
    - Enable RLS on user_activities table
    - Add policies for reading and creating activities
    - Ensure users can only access their own activities
*/

-- Create user_activities table if it doesn't exist
DO $$ 
BEGIN
  CREATE TABLE IF NOT EXISTS user_activities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
    activity_type text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
  );
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- Enable RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- Safely drop existing policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own activities" ON user_activities;
  DROP POLICY IF EXISTS "Users can create own activities" ON user_activities;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- Create new policies
DO $$ 
BEGIN
  -- Read policy
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

  -- Create policy
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