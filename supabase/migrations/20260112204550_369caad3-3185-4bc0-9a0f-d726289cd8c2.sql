-- Add is_featured column to artists table for homepage carousel
ALTER TABLE public.artists 
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Create an index for featured artists queries
CREATE INDEX idx_artists_is_featured ON public.artists(is_featured) WHERE is_featured = true;