-- Fix RLS policies for messages table to enable real-time messaging
-- This migration adds the missing INSERT and UPDATE policies for the messages table

-- Enable RLS on messages table (if not already enabled)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Add INSERT policy for messages (allows users to create messages in their conversations)
CREATE POLICY "Users can insert messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

-- Add UPDATE policy for messages (allows users to update messages in their conversations)
CREATE POLICY "Users can update messages in their conversations" ON messages
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

-- Note: The SELECT policy should already exist, but let's ensure it does
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );
