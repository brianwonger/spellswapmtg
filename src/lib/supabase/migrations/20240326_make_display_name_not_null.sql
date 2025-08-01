-- Make display_name NOT NULL in profiles table
-- First, update any existing NULL display_name values to use the username
UPDATE profiles 
SET display_name = username 
WHERE display_name IS NULL or display_name = '';

-- Then alter the table to make display_name NOT NULL
ALTER TABLE profiles 
ALTER COLUMN display_name SET NOT NULL;