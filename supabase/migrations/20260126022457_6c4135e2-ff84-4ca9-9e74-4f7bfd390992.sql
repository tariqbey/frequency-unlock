-- Create table to track completed full album listens
CREATE TABLE public.album_listen_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, release_id)
);

-- Enable RLS
ALTER TABLE public.album_listen_completions ENABLE ROW LEVEL SECURITY;

-- Users can view their own completions
CREATE POLICY "Users can view their own completions"
ON public.album_listen_completions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own completions
CREATE POLICY "Users can insert their own completions"
ON public.album_listen_completions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all completions
CREATE POLICY "Admins can view all completions"
ON public.album_listen_completions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_album_listen_completions_user_release ON public.album_listen_completions(user_id, release_id);

-- Add release_id to comments table for tracking which release a comment belongs to
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS release_id uuid REFERENCES public.releases(id) ON DELETE CASCADE;

-- Create function to check if user has completed album listen
CREATE OR REPLACE FUNCTION public.has_completed_album_listen(_user_id uuid, _release_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.album_listen_completions
    WHERE user_id = _user_id AND release_id = _release_id
  )
$$;