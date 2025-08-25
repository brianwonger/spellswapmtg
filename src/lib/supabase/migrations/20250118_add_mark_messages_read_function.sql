-- Add function to mark messages as read
-- This enables the mark as read functionality for the messaging system

-- Create function to mark messages as read in a conversation
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

-- Create a function to mark all unread messages in a conversation as read
-- This is useful when a user opens a conversation
CREATE OR REPLACE FUNCTION mark_conversation_messages_as_read(conversation_uuid UUID, user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
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

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION mark_conversation_messages_as_read(UUID, UUID) TO authenticated;
