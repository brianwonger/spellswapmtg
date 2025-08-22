-- Add RLS policies for conversations table
-- This allows users to create and manage conversations for transactions they're involved in

-- Policy for SELECT: Users can view conversations where they are a participant
CREATE POLICY "Users can view conversations they're involved in" ON conversations
  FOR SELECT USING (
    auth.uid() = participant1_id OR
    auth.uid() = participant2_id
  );

-- Policy for INSERT: Users can create conversations where they are participant1 (buyer)
-- and the transaction exists with them as buyer
CREATE POLICY "Users can create conversations as buyers" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid() = participant1_id AND
    EXISTS (
      SELECT 1 FROM transactions
      WHERE id = transaction_id
      AND buyer_id = auth.uid()
    )
  );

-- Policy for UPDATE: Users can update conversations they're involved in
CREATE POLICY "Users can update conversations they're involved in" ON conversations
  FOR UPDATE USING (
    auth.uid() = participant1_id OR
    auth.uid() = participant2_id
  );

-- Policy for DELETE: Users can delete conversations they're involved in
CREATE POLICY "Users can delete conversations they're involved in" ON conversations
  FOR DELETE USING (
    auth.uid() = participant1_id OR
    auth.uid() = participant2_id
  );

-- Add RLS policies for messages table (if not already present)

-- Policy for SELECT: Users can view messages in conversations they're involved in
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

-- Policy for INSERT: Users can send messages in conversations they're involved in
CREATE POLICY "Users can send messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    ) AND
    auth.uid() = sender_id
  );

-- Policy for UPDATE: Users can update their own messages
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Policy for DELETE: Users can delete their own messages
CREATE POLICY "Users can delete their own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);
