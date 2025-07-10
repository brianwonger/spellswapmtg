-- Function to log when a container is deleted
CREATE OR REPLACE FUNCTION log_container_removal()
RETURNS trigger AS $$
DECLARE
    card_count INTEGER;
BEGIN
    -- Get the count of cards in the container
    SELECT COALESCE(SUM(quantity), 0) INTO card_count
    FROM container_items
    WHERE container_id = OLD.id;

    INSERT INTO user_activities (
        user_id,
        activity_type,
        description,
        metadata
    )
    VALUES (
        OLD.user_id,
        'container_deleted',
        'Deleted container: ' || OLD.name || ' (' || OLD.container_type || ') containing ' || card_count || ' cards',
        jsonb_build_object(
            'container_id', OLD.id,
            'container_name', OLD.name,
            'container_type', OLD.container_type,
            'card_count', card_count,
            'description', OLD.description,
            'visibility', OLD.visibility,
            'was_default', OLD.is_default
        )
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for container removals
CREATE TRIGGER log_container_removal_trigger
    BEFORE DELETE ON containers
    FOR EACH ROW
    EXECUTE FUNCTION log_container_removal(); 