-- Drop existing problematic RLS policies on players table
DROP POLICY IF EXISTS "Players can view players in their game" ON public.players;
DROP POLICY IF EXISTS "Game participants can update players" ON public.players;
DROP POLICY IF EXISTS "Users can create their own player" ON public.players;

-- Drop existing policies on games table that reference players
DROP POLICY IF EXISTS "Players can view their games" ON public.games;
DROP POLICY IF EXISTS "Game participants can update game" ON public.games;
DROP POLICY IF EXISTS "Host can delete game" ON public.games;
DROP POLICY IF EXISTS "Authenticated users can create games" ON public.games;

-- Create security definer function to check if user is in a game
CREATE OR REPLACE FUNCTION public.is_player_in_game(_game_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players
    WHERE game_id = _game_id
      AND id = auth.uid()::text
  )
$$;

-- Create security definer function to check if user is game host
CREATE OR REPLACE FUNCTION public.is_game_host(_game_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.players
    WHERE game_id = _game_id
      AND id = auth.uid()::text
      AND is_host = true
  )
$$;

-- Create security definer function to get user's game_id
CREATE OR REPLACE FUNCTION public.get_user_game_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT game_id
  FROM public.players
  WHERE id = auth.uid()::text
  LIMIT 1
$$;

-- GAMES table policies (using functions to avoid recursion)
CREATE POLICY "Authenticated users can create games" 
ON public.games 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Players can view their games" 
ON public.games 
FOR SELECT 
USING (public.is_player_in_game(id));

CREATE POLICY "Game participants can update game" 
ON public.games 
FOR UPDATE 
USING (public.is_player_in_game(id));

CREATE POLICY "Host can delete game" 
ON public.games 
FOR DELETE 
USING (public.is_game_host(id));

-- PLAYERS table policies (using functions to avoid recursion)
-- INSERT: User can only create a player with their own auth.uid() as id
CREATE POLICY "Users can create their own player" 
ON public.players 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND id = auth.uid()::text);

-- SELECT: Players can view other players in the same game
-- Using a function to get user's game_id avoids self-reference
CREATE POLICY "Players can view players in their game" 
ON public.players 
FOR SELECT 
USING (game_id = public.get_user_game_id());

-- UPDATE: Players in the same game can update player records
CREATE POLICY "Game participants can update players" 
ON public.players 
FOR UPDATE 
USING (game_id = public.get_user_game_id());