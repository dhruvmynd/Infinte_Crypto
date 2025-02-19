/*
  # Create user activities table

  1. New Tables
    - `user_activities`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `activity_type` (text)
      - `details` (jsonb)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `user_activities` table
    - Add policies for:
      - Users can read their own activities
      - Users can create their own activities
*/

CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  activity_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own activities"
  ON user_activities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own activities"
  ON user_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);