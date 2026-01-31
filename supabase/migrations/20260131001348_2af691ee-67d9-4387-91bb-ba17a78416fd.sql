-- Add is_featured column to releases table
ALTER TABLE public.releases
ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false;

-- Create an index for faster featured releases queries
CREATE INDEX idx_releases_is_featured ON public.releases (is_featured) WHERE is_featured = true;