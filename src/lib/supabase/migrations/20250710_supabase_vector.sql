-- Drop the GIN index if it exists
DROP INDEX IF EXISTS default_cards_fts_idx;

-- Then, drop the column if it exists
ALTER TABLE default_cards DROP COLUMN IF EXISTS fts;

-- Add a new column to store the text search vectors
ALTER TABLE default_cards
ADD COLUMN fts tsvector
GENERATED ALWAYS AS (
  to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(type_line, '') || ' ' ||
    COALESCE(oracle_text, '') || ' ' ||
    COALESCE(flavor_text, '')
  )
) STORED;

-- Create a GIN index on the new column for fast searching
CREATE INDEX default_cards_fts_idx ON default_cards USING GIN (fts);
