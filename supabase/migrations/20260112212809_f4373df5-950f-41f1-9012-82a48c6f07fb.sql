-- Create radio_playlists table
CREATE TABLE IF NOT EXISTS public.radio_playlists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  station_mood text, -- null means can be used on any station
  is_active boolean NOT NULL DEFAULT true,
  cover_image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Create radio_playlist_tracks junction table
CREATE TABLE IF NOT EXISTS public.radio_playlist_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id uuid NOT NULL REFERENCES public.radio_playlists(id) ON DELETE CASCADE,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- Enable RLS
ALTER TABLE public.radio_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_playlist_tracks ENABLE ROW LEVEL SECURITY;

-- RLS policies for radio_playlists
CREATE POLICY "Admins can manage playlists" 
ON public.radio_playlists 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active playlists" 
ON public.radio_playlists 
FOR SELECT 
USING (is_active = true);

-- RLS policies for radio_playlist_tracks
CREATE POLICY "Admins can manage playlist tracks" 
ON public.radio_playlist_tracks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view playlist tracks of active playlists" 
ON public.radio_playlist_tracks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.radio_playlists 
  WHERE id = playlist_id AND is_active = true
));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_radio_playlist_tracks_playlist ON public.radio_playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_radio_playlist_tracks_position ON public.radio_playlist_tracks(playlist_id, position);

-- Trigger for updated_at
CREATE TRIGGER update_radio_playlists_updated_at
BEFORE UPDATE ON public.radio_playlists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();