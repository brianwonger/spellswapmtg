-- Add policy to allow viewing profiles of sellers
CREATE POLICY "Users can view profiles of sellers"
ON public.profiles
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_cards
    WHERE user_cards.user_id = profiles.id
    AND user_cards.is_for_sale = true
  )
); 