-- Drop existing permissive RLS policies
DROP POLICY IF EXISTS "Anyone can view games" ON public.games;
DROP POLICY IF EXISTS "Anyone can create games" ON public.games;
DROP POLICY IF EXISTS "Anyone can update games" ON public.games;
DROP POLICY IF EXISTS "Anyone can delete games" ON public.games;
DROP POLICY IF EXISTS "Anyone can view players" ON public.players;
DROP POLICY IF EXISTS "Anyone can create players" ON public.players;
DROP POLICY IF EXISTS "Anyone can update players" ON public.players;
DROP POLICY IF EXISTS "Anyone can delete players" ON public.players;

-- Create secure RLS policies for games table
-- Players can only view games they are participating in
CREATE POLICY "Players can view their games"
ON public.games FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.game_id = games.id 
    AND players.id = auth.uid()::text
  )
);

-- Authenticated users can create games
CREATE POLICY "Authenticated users can create games"
ON public.games FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Only host can update game
CREATE POLICY "Host can update game"
ON public.games FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.game_id = games.id 
    AND players.is_host = true
    AND players.id = auth.uid()::text
  )
);

-- Only host can delete game
CREATE POLICY "Host can delete game"
ON public.games FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.game_id = games.id 
    AND players.is_host = true
    AND players.id = auth.uid()::text
  )
);

-- Create secure RLS policies for players table
-- Players can view other players in their game
CREATE POLICY "Players can view players in their game"
ON public.players FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.players AS my_player 
    WHERE my_player.game_id = players.game_id 
    AND my_player.id = auth.uid()::text
  )
);

-- Authenticated users can create their own player record
CREATE POLICY "Users can create their own player"
ON public.players FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND id = auth.uid()::text
);

-- Players can only update their own record
CREATE POLICY "Players can update own record"
ON public.players FOR UPDATE
USING (id = auth.uid()::text);

-- Players cannot delete records (game host can manage via game deletion)
-- No delete policy = no deletes allowed