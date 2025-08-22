-- This policy allows users (buyers or sellers) to view items within a transaction they are part of.
CREATE POLICY "Users can view items in their transactions"
ON public.transaction_items
FOR SELECT
USING (
  auth.uid() IN (
    SELECT buyer_id FROM public.transactions WHERE id = transaction_id
  )
  OR
  auth.uid() IN (
    SELECT seller_id FROM public.transactions WHERE id = transaction_id
  )
);

-- This policy allows a user who is the buyer in a 'pending' transaction to insert items into it.
CREATE POLICY "Buyers can add items to their own pending transactions"
ON public.transaction_items
FOR INSERT
WITH CHECK (
  auth.uid() = (
    SELECT buyer_id FROM public.transactions
    WHERE id = transaction_id AND status = 'pending'
  )
);

-- This policy allows a user who is the buyer in a 'pending' transaction to delete items from it.
CREATE POLICY "Buyers can remove items from their own pending transactions"
ON public.transaction_items
FOR DELETE
USING (
  auth.uid() = (
    SELECT buyer_id FROM public.transactions
    WHERE id = transaction_id AND status = 'pending'
  )
);
