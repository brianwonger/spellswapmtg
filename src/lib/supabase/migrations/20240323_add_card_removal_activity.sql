-- Function to log when a card is removed from collection
CREATE OR REPLACE FUNCTION log_card_removal()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_activities (
    user_id,
    activity_type,
    description,
    metadata
  )
  VALUES (
    OLD.user_id,
    'card_removed',
    'Removed ' || OLD.quantity || 'x ' || (SELECT name FROM default_cards WHERE id = OLD.card_id) || ' from collection',
    jsonb_build_object(
      'card_id', OLD.card_id,
      'quantity', OLD.quantity,
      'condition', OLD.condition,
      'foil', OLD.foil,
      'language', OLD.language
    )
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for card removals
CREATE TRIGGER log_card_removal_trigger
  BEFORE DELETE ON user_cards
  FOR EACH ROW
  EXECUTE FUNCTION log_card_removal();

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own activities" ON user_activities;
DROP POLICY IF EXISTS "Users can view activities related to their transactions" ON user_activities;

-- Add RLS policies for user_activities
CREATE POLICY "Users can view their own activities"
  ON user_activities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities"
  ON user_activities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Triggers can insert activities"
  ON user_activities
  FOR INSERT
  WITH CHECK (true);

-- Grant necessary permissions to the trigger function
GRANT INSERT ON user_activities TO authenticated; 