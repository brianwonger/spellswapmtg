-- Drop the unused container_cards table
DROP TABLE IF EXISTS container_cards;

-- Create container_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS container_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  container_id UUID NOT NULL REFERENCES containers(id) ON DELETE CASCADE,
  user_card_id UUID NOT NULL REFERENCES user_cards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(container_id, user_card_id)
);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_container_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_container_items_updated_at
  BEFORE UPDATE ON container_items
  FOR EACH ROW
  EXECUTE FUNCTION update_container_items_updated_at();

-- Add RLS policies for container_items
ALTER TABLE container_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own container items"
  ON container_items
  FOR SELECT
  USING (
    container_id IN (
      SELECT id FROM containers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own container items"
  ON container_items
  FOR INSERT
  WITH CHECK (
    container_id IN (
      SELECT id FROM containers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own container items"
  ON container_items
  FOR UPDATE
  USING (
    container_id IN (
      SELECT id FROM containers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    container_id IN (
      SELECT id FROM containers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own container items"
  ON container_items
  FOR DELETE
  USING (
    container_id IN (
      SELECT id FROM containers WHERE user_id = auth.uid()
    )
  ); 