-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_coordinates;

-- Create a function to extract coordinates from WKB format
CREATE OR REPLACE FUNCTION get_coordinates(point text)
RETURNS TABLE (lat double precision, lng double precision)
LANGUAGE sql
AS $$
  SELECT 
    ST_Y(point::geometry) as lat,
    ST_X(point::geometry) as lng;
$$; 