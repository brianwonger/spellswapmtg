-- update a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_username TEXT;
  v_display_name TEXT;
BEGIN
  -- Determine the username to use
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    'user_' || substr(NEW.id::text, 1, 8)
  );

  -- Determine the display_name, falling back to the username if it's null or empty
  v_display_name := LTRIM(RTRIM(NEW.raw_user_meta_data->>'display_name'));
  IF v_display_name IS NULL OR v_display_name = '' THEN
    v_display_name := v_username;
  END IF;

  -- Insert the new profile
  INSERT INTO public.profiles (id, username, display_name, email)
  VALUES (
    NEW.id,
    v_username,
    v_display_name,
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
