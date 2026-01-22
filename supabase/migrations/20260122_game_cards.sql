-- Create game_cards table for storing editable card data
CREATE TABLE IF NOT EXISTS public.game_cards (
    id TEXT PRIMARY KEY DEFAULT 'main',
    cards_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anyone to read game_cards" ON public.game_cards;
DROP POLICY IF EXISTS "Allow anyone to insert game_cards" ON public.game_cards;
DROP POLICY IF EXISTS "Allow anyone to update game_cards" ON public.game_cards;

-- Create permissive policies for game_cards
-- Anyone can read
CREATE POLICY "Allow anyone to read game_cards"
    ON public.game_cards
    FOR SELECT
    USING (true);

-- Anyone can insert (for initial creation)
CREATE POLICY "Allow anyone to insert game_cards"
    ON public.game_cards
    FOR INSERT
    WITH CHECK (true);

-- Anyone can update (for editing cards)
CREATE POLICY "Allow anyone to update game_cards"
    ON public.game_cards
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Insert default row if not exists
INSERT INTO public.game_cards (id, cards_data)
VALUES ('main', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Grant access to authenticated and anon users
GRANT SELECT, INSERT, UPDATE ON public.game_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.game_cards TO anon;
