-- Add RLS policy for user_activities table
CREATE POLICY "Users can manage their own activities"
  ON user_activities
  FOR ALL
  USING (auth.uid() = user_id);

-- Allow users to view activities related to their transactions
CREATE POLICY "Users can view activities related to their transactions"
  ON user_activities
  FOR SELECT
  USING (
    CASE 
      WHEN metadata->>'transaction_id' IS NOT NULL THEN
        auth.uid() IN (
          SELECT buyer_id FROM transactions WHERE id = (metadata->>'transaction_id')::UUID
          UNION
          SELECT seller_id FROM transactions WHERE id = (metadata->>'transaction_id')::UUID
        )
      ELSE false
    END
  ); 