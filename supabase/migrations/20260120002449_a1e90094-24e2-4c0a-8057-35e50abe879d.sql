-- Add columns for tie revote functionality
ALTER TABLE public.games 
ADD COLUMN IF NOT EXISTS tied_players text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_revote boolean DEFAULT false;