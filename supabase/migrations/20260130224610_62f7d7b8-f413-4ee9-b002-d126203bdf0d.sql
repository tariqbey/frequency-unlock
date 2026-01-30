-- Create favorites tables for user profile
CREATE TABLE public.favorite_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

CREATE TABLE public.favorite_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, release_id)
);

-- Enable RLS
ALTER TABLE public.favorite_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_releases ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favorites
CREATE POLICY "Users can view their own favorite tracks"
ON public.favorite_tracks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite tracks"
ON public.favorite_tracks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite tracks"
ON public.favorite_tracks FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own favorite releases"
ON public.favorite_releases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite releases"
ON public.favorite_releases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite releases"
ON public.favorite_releases FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_favorite_tracks_user_id ON public.favorite_tracks(user_id);
CREATE INDEX idx_favorite_releases_user_id ON public.favorite_releases(user_id);