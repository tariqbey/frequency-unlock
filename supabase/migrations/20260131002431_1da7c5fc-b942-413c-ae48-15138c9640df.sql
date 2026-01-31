-- Create user playlists table
CREATE TABLE public.playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create playlist tracks junction table
CREATE TABLE public.playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- Enable RLS
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Playlists policies
CREATE POLICY "Users can view their own playlists"
ON public.playlists FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view public playlists"
ON public.playlists FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create their own playlists"
ON public.playlists FOR INSERT
WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

CREATE POLICY "Users can update their own playlists"
ON public.playlists FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
ON public.playlists FOR DELETE
USING (auth.uid() = user_id);

-- Playlist tracks policies
CREATE POLICY "Users can view tracks in their playlists"
ON public.playlist_tracks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.playlists
  WHERE playlists.id = playlist_tracks.playlist_id
  AND playlists.user_id = auth.uid()
));

CREATE POLICY "Users can view tracks in public playlists"
ON public.playlist_tracks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.playlists
  WHERE playlists.id = playlist_tracks.playlist_id
  AND playlists.is_public = true
));

CREATE POLICY "Users can add tracks to their playlists"
ON public.playlist_tracks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.playlists
  WHERE playlists.id = playlist_tracks.playlist_id
  AND playlists.user_id = auth.uid()
));

CREATE POLICY "Users can remove tracks from their playlists"
ON public.playlist_tracks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.playlists
  WHERE playlists.id = playlist_tracks.playlist_id
  AND playlists.user_id = auth.uid()
));

CREATE POLICY "Users can update track positions in their playlists"
ON public.playlist_tracks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.playlists
  WHERE playlists.id = playlist_tracks.playlist_id
  AND playlists.user_id = auth.uid()
));

-- Indexes for performance
CREATE INDEX idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX idx_playlist_tracks_playlist_id ON public.playlist_tracks(playlist_id);
CREATE INDEX idx_playlist_tracks_track_id ON public.playlist_tracks(track_id);

-- Trigger for updated_at
CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();