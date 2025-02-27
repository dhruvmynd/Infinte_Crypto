/*
  # Create user feedback table

  1. New Tables
    - `user_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `user_identifier` (text)
      - `feedback` (text)
      - `category` (text)
      - `created_at` (timestamp)
      - `status` (text)
      - `admin_response` (text)
      - `responded_at` (timestamp)
  2. Security
    - Enable RLS on `user_feedback` table
    - Add policy for authenticated users to create feedback
    - Add policy for public access to view feedback
*/

-- Create user feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_identifier text NOT NULL,
  feedback text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'new',
  admin_response text,
  responded_at timestamptz
);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can create feedback"
  ON user_feedback
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can view feedback"
  ON user_feedback
  FOR SELECT
  TO public
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX idx_user_feedback_category ON user_feedback(category);
CREATE INDEX idx_user_feedback_status ON user_feedback(status);
CREATE INDEX idx_user_feedback_created_at ON user_feedback(created_at DESC);