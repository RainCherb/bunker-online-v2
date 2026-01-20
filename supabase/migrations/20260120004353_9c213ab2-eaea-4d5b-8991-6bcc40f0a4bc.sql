-- Create table to track profile views
CREATE TABLE public.profile_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL,
  viewer_id TEXT NOT NULL,
  viewed_player_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Allow players in game to insert their views
CREATE POLICY "Players can record profile views"
ON public.profile_views
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players
    WHERE players.game_id = profile_views.game_id
    AND players.id = auth.uid()::text
  )
);

-- Allow players in game to read profile views for their game
CREATE POLICY "Players can read game profile views"
ON public.profile_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players
    WHERE players.game_id = profile_views.game_id
    AND players.id = auth.uid()::text
  )
);

-- Create index for efficient querying
CREATE INDEX idx_profile_views_game ON public.profile_views(game_id);
CREATE INDEX idx_profile_views_viewed ON public.profile_views(game_id, viewed_player_id);