-- Add radio-specific fields to tracks table
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS radio_enabled boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS radio_priority integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_played_at timestamp with time zone;

-- Create radio_schedule table for featured/scheduled tracks
CREATE TABLE IF NOT EXISTS public.radio_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  station_mood text, -- null means "all stations"
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  priority integer NOT NULL DEFAULT 10,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on radio_schedule
ALTER TABLE public.radio_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies for radio_schedule
CREATE POLICY "Admins can manage radio schedule" 
ON public.radio_schedule 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active radio schedule" 
ON public.radio_schedule 
FOR SELECT 
USING (starts_at <= now() AND ends_at >= now());

-- Create radio_stats table for tracking plays
CREATE TABLE IF NOT EXISTS public.radio_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  station_mood text,
  played_at timestamp with time zone NOT NULL DEFAULT now(),
  listener_count integer DEFAULT 1
);

-- Enable RLS on radio_stats
ALTER TABLE public.radio_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for radio_stats
CREATE POLICY "Admins can view radio stats" 
ON public.radio_stats 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert radio stats" 
ON public.radio_stats 
FOR INSERT 
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_tracks_radio_enabled ON public.tracks(radio_enabled) WHERE radio_enabled = true;
CREATE INDEX IF NOT EXISTS idx_tracks_mood ON public.tracks(mood) WHERE mood IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_radio_schedule_active ON public.radio_schedule(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_radio_stats_played_at ON public.radio_stats(played_at DESC);