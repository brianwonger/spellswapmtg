-- migrations/20240715_add_increment_card_quantity_function.sql

CREATE OR REPLACE FUNCTION public.increment_card_quantity(
    p_card_id uuid,
    p_user_id uuid,
    p_condition character varying,
    p_foil boolean,
    p_language character varying,
    p_quantity_to_add integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_card_id UUID;
    v_container_item_id UUID;
    v_default_container_id UUID;
BEGIN
    -- Find the existing user_card
    SELECT id INTO v_user_card_id
    FROM public.user_cards
    WHERE card_id = p_card_id
      AND user_id = p_user_id
      AND condition = p_condition
      AND foil = p_foil
      AND language = p_language
    LIMIT 1;

    -- If a matching card is not found, raise an error.
    IF v_user_card_id IS NULL THEN
        RAISE EXCEPTION 'No existing card found to increment for user_id: %, card_id: %', p_user_id, p_card_id;
    END IF;

    -- Increment quantity in user_cards
    UPDATE public.user_cards
    SET quantity = quantity + p_quantity_to_add
    WHERE id = v_user_card_id;

    -- Find the default container for the user
    SELECT id INTO v_default_container_id
    FROM public.containers
    WHERE user_id = p_user_id AND is_default = true
    LIMIT 1;

    -- If no default container, something is wrong
    IF v_default_container_id IS NULL THEN
        RAISE EXCEPTION 'No default container found for user_id: %', p_user_id;
    END IF;

    -- Check if the card is already in the default container
    SELECT id INTO v_container_item_id
    FROM public.container_items
    WHERE user_card_id = v_user_card_id
      AND container_id = v_default_container_id
    LIMIT 1;
    
    IF v_container_item_id IS NOT NULL THEN
        -- It exists in the default container, so update its quantity
        UPDATE public.container_items
        SET quantity = quantity + p_quantity_to_add
        WHERE id = v_container_item_id;
    ELSE
        -- It does not exist in the default container, so insert it
        INSERT INTO public.container_items (user_card_id, container_id, quantity)
        VALUES (v_user_card_id, v_default_container_id, p_quantity_to_add);
    END IF;

END;
$$; 