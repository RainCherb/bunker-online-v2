-- Fix database function with proper security settings
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add database constraints for data integrity
ALTER TABLE players ADD CONSTRAINT player_name_length 
  CHECK (length(name) <= 50 AND length(name) > 0);

ALTER TABLE games ADD CONSTRAINT game_id_format 
  CHECK (id ~ '^[A-Z0-9]{6}$');