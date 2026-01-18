-- Add policy for game participants to update game (for voting, phase changes, etc.)
-- This is needed because all players need to be able to cast votes and update game state
DROP POLICY IF EXISTS "Host can update game" ON public.games;

CREATE POLICY "Game participants can update game"
ON public.games FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.game_id = games.id 
    AND players.id = auth.uid()::text
  )
);

-- Allow any game participant to update player records (for voting against, etc.)
DROP POLICY IF EXISTS "Players can update own record" ON public.players;

CREATE POLICY "Game participants can update players"
ON public.players FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players AS my_player 
    WHERE my_player.game_id = players.game_id 
    AND my_player.id = auth.uid()::text
  )
);