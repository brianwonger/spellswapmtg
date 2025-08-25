-- Fix RLS policies for messages table to enable real-time messaging
-- This migration adds the missing INSERT and UPDATE policies for the messages table
-- Updated to properly support marking messages as read

-- Enable RLS on messages table (if not already enabled)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;

-- Add SELECT policy for messages (allows users to view messages in conversations they're involved in)
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

-- Add INSERT policy for messages (allows users to send messages in conversations they're involved in)
CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    ) AND
    auth.uid() = sender_id
  );

-- Add UPDATE policy for messages (allows users to update messages in conversations they're involved in)
-- This is crucial for marking messages as read - users need to update messages from other participants
CREATE POLICY "Users can update messages in their conversations" ON messages
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

-- Add DELETE policy for messages (allows users to delete their own messages)
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- Create function to mark messages as read
-- This function can be called by users to mark messages as read in their conversations
CREATE OR REPLACE FUNCTION mark_messages_as_read(conversation_uuid UUID, user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow users to mark messages as read in conversations they're involved in
  -- and only for messages that were sent by the other participant (not their own messages)
  UPDATE messages
  SET is_read = true
  WHERE conversation_id = conversation_uuid
    AND sender_id != user_uuid
    AND NOT is_read
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE id = conversation_uuid
      AND (participant1_id = user_uuid OR participant2_id = user_uuid)
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_messages_as_read(UUID, UUID) TO authenticated;
