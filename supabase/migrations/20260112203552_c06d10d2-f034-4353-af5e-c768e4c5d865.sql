-- Add mood column to tracks table for radio stations
ALTER TABLE public.tracks 
ADD COLUMN mood text;

-- Create an index for filtering by mood
CREATE INDEX idx_tracks_mood ON public.tracks(mood);

-- Add a comment explaining valid moods
COMMENT ON COLUMN public.tracks.mood IS 'Track mood/genre for radio stations: chill, energetic, focus, melancholic, uplifting';