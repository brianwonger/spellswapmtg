-- Add missing INSERT policy for transactions table
-- This allows users to create transactions where they are the buyer

CREATE POLICY "Users can create transactions as buyers" ON transactions 
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Also add UPDATE policy for transaction status changes
CREATE POLICY "Users can update transactions they're involved in" ON transactions 
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Add INSERT policy for transaction_items 
-- Users can add items to transactions where they are the buyer
CREATE POLICY "Buyers can add items to their transactions" ON transaction_items 
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT buyer_id FROM transactions WHERE id = transaction_id)
  );

-- Add SELECT policy for transaction_items
-- Users can view items in transactions they're involved in
CREATE POLICY "Users can view transaction items they're involved in" ON transaction_items 
  FOR SELECT USING (
    auth.uid() IN (
      SELECT buyer_id FROM transactions WHERE id = transaction_id
      UNION
      SELECT seller_id FROM transactions WHERE id = transaction_id
    )
  );
