-- Enable shared, server-driven timers and per-turn reveal state
ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS phase_ends_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.games
ADD COLUMN IF NOT EXISTS turn_has_revealed BOOLEAN NOT NULL DEFAULT FALSE;

-- Improve realtime payload completeness for UPDATE events
ALTER TABLE public.games REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- Ensure realtime is enabled for these tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  END IF;
END $$;