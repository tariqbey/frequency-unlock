-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM ('admin', 'artist', 'moderator', 'user');

-- Create enum for profile status
CREATE TYPE public.profile_status AS ENUM ('active', 'suspended');

-- Create enum for release type
CREATE TYPE public.release_type AS ENUM ('album', 'single', 'ep');

-- Create enum for donation status
CREATE TYPE public.donation_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- Create enum for event types
CREATE TYPE public.event_type AS ENUM ('play_start', 'play_complete', 'download', 'donation_start', 'donation_paid', 'thread_post', 'comment_post');

-- 1) Artists table
CREATE TABLE public.artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  role app_role NOT NULL DEFAULT 'user',
  artist_id UUID REFERENCES public.artists(id) ON DELETE SET NULL,
  status profile_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) Releases table
CREATE TABLE public.releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID REFERENCES public.artists(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  type release_type NOT NULL DEFAULT 'album',
  description TEXT,
  cover_art_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  suggested_price_cents INTEGER,
  streaming_requires_donation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4) Tracks table
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  track_number INTEGER NOT NULL DEFAULT 1,
  audio_path TEXT NOT NULL,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5) Track commentary table
CREATE TABLE public.track_commentary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE NOT NULL UNIQUE,
  commentary_text TEXT NOT NULL,
  timestamp_notes_json JSONB,
  commentary_audio_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6) Donations table
CREATE TABLE public.donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT,
  status donation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7) Download tokens table
CREATE TABLE public.download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  max_downloads INTEGER NOT NULL DEFAULT 5,
  downloads_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8) Events table for analytics
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type event_type NOT NULL,
  release_id UUID REFERENCES public.releases(id) ON DELETE SET NULL,
  track_id UUID REFERENCES public.tracks(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9) Forums table
CREATE TABLE public.forums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10) Threads table
CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID REFERENCES public.forums(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11) Comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 12) Admin audit log
CREATE TABLE public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_content_id UUID,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Create user_roles table for proper role management (separate from profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's artist_id
CREATE OR REPLACE FUNCTION public.get_user_artist_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT artist_id FROM public.profiles WHERE user_id = _user_id
$$;

-- Function to check if user is active
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND status = 'active'
  )
$$;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES POLICIES
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ARTISTS POLICIES
CREATE POLICY "Anyone can view artists" ON public.artists
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage artists" ON public.artists
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RELEASES POLICIES
CREATE POLICY "Anyone can view published releases" ON public.releases
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage all releases" ON public.releases
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can manage their own releases" ON public.releases
  FOR ALL USING (
    public.has_role(auth.uid(), 'artist') AND 
    artist_id = public.get_user_artist_id(auth.uid())
  );

-- TRACKS POLICIES
CREATE POLICY "Anyone can view tracks of published releases" ON public.tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.releases 
      WHERE releases.id = tracks.release_id AND releases.is_published = true
    )
  );

CREATE POLICY "Admins can manage all tracks" ON public.tracks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can manage tracks of their releases" ON public.tracks
  FOR ALL USING (
    public.has_role(auth.uid(), 'artist') AND
    EXISTS (
      SELECT 1 FROM public.releases 
      WHERE releases.id = tracks.release_id 
      AND releases.artist_id = public.get_user_artist_id(auth.uid())
    )
  );

-- TRACK_COMMENTARY POLICIES
CREATE POLICY "Anyone can view commentary of published tracks" ON public.track_commentary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tracks
      JOIN public.releases ON releases.id = tracks.release_id
      WHERE tracks.id = track_commentary.track_id AND releases.is_published = true
    )
  );

CREATE POLICY "Admins can manage all commentary" ON public.track_commentary
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can manage commentary of their tracks" ON public.track_commentary
  FOR ALL USING (
    public.has_role(auth.uid(), 'artist') AND
    EXISTS (
      SELECT 1 FROM public.tracks
      JOIN public.releases ON releases.id = tracks.release_id
      WHERE tracks.id = track_commentary.track_id
      AND releases.artist_id = public.get_user_artist_id(auth.uid())
    )
  );

-- DONATIONS POLICIES
CREATE POLICY "Users can view their own donations" ON public.donations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create donations" ON public.donations
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Admins can view all donations" ON public.donations
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- DOWNLOAD_TOKENS POLICIES
CREATE POLICY "Users can view their own download tokens" ON public.download_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.donations
      WHERE donations.id = download_tokens.donation_id
      AND donations.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage download tokens" ON public.download_tokens
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- EVENTS POLICIES
CREATE POLICY "Users can create events" ON public.events
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all events" ON public.events
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- FORUMS POLICIES
CREATE POLICY "Anyone can view forums" ON public.forums
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage forums" ON public.forums
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- THREADS POLICIES
CREATE POLICY "Anyone can view threads" ON public.threads
  FOR SELECT USING (true);

CREATE POLICY "Active users can create threads" ON public.threads
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update their own threads" ON public.threads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own threads" ON public.threads
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Moderators can manage threads" ON public.threads
  FOR ALL USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- COMMENTS POLICIES
CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT USING (true);

CREATE POLICY "Active users can create comments" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_user_active(auth.uid()));

CREATE POLICY "Users can update their own comments" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Moderators can manage comments" ON public.comments
  FOR ALL USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- ADMIN_AUDIT_LOG POLICIES
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create audit log entries" ON public.admin_audit_log
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  -- Add default 'user' role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger for track_commentary
CREATE TRIGGER update_track_commentary_updated_at
  BEFORE UPDATE ON public.track_commentary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('artwork', 'artwork', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', false);

-- Storage policies for artwork (public)
CREATE POLICY "Anyone can view artwork" ON storage.objects
  FOR SELECT USING (bucket_id = 'artwork');

CREATE POLICY "Admins can upload artwork" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'artwork' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can upload artwork" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'artwork' AND public.has_role(auth.uid(), 'artist'));

CREATE POLICY "Admins can delete artwork" ON storage.objects
  FOR DELETE USING (bucket_id = 'artwork' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies for audio (private - accessed via signed URLs)
CREATE POLICY "Admins can manage audio" ON storage.objects
  FOR ALL USING (bucket_id = 'audio' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Artists can upload audio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'audio' AND public.has_role(auth.uid(), 'artist'));

-- Create indexes for performance
CREATE INDEX idx_releases_artist ON public.releases(artist_id);
CREATE INDEX idx_releases_published ON public.releases(is_published);
CREATE INDEX idx_tracks_release ON public.tracks(release_id);
CREATE INDEX idx_donations_user ON public.donations(user_id);
CREATE INDEX idx_donations_release ON public.donations(release_id);
CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_events_type ON public.events(event_type);
CREATE INDEX idx_events_created ON public.events(created_at);
CREATE INDEX idx_threads_forum ON public.threads(forum_id);
CREATE INDEX idx_comments_thread ON public.comments(thread_id);