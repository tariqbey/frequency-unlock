-- Create artist application status enum
CREATE TYPE public.application_status AS ENUM ('pending', 'approved', 'rejected');

-- Create artist applications table
CREATE TABLE public.artist_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  artist_name TEXT NOT NULL,
  bio TEXT,
  portfolio_url TEXT,
  sample_tracks_urls TEXT[],
  status application_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add approval status to releases table
ALTER TABLE public.releases ADD COLUMN approval_status application_status NOT NULL DEFAULT 'approved';
ALTER TABLE public.releases ADD COLUMN reviewed_by UUID;
ALTER TABLE public.releases ADD COLUMN reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.releases ADD COLUMN rejection_reason TEXT;

-- Add likes and shares tracking to events
-- (Already have play_start, adding share tracking)

-- Create shares table for social sharing analytics
CREATE TABLE public.shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'twitter', 'facebook', 'copy_link', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.artist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Artist applications RLS policies
CREATE POLICY "Users can view their own applications"
ON public.artist_applications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create applications"
ON public.artist_applications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all applications"
ON public.artist_applications FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Shares RLS policies
CREATE POLICY "Anyone can create shares"
ON public.shares FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view shares"
ON public.shares FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Create indexes for analytics
CREATE INDEX idx_shares_release_id ON public.shares(release_id);
CREATE INDEX idx_shares_track_id ON public.shares(track_id);
CREATE INDEX idx_shares_created_at ON public.shares(created_at);
CREATE INDEX idx_artist_applications_status ON public.artist_applications(status);
CREATE INDEX idx_releases_approval_status ON public.releases(approval_status);

-- Update releases RLS to include approval status check for public viewing
DROP POLICY IF EXISTS "Anyone can view published releases" ON public.releases;
CREATE POLICY "Anyone can view published and approved releases"
ON public.releases FOR SELECT
USING (is_published = true AND approval_status = 'approved');

-- Create trigger for updated_at on artist_applications
CREATE TRIGGER update_artist_applications_updated_at
BEFORE UPDATE ON public.artist_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();