import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { TrackList } from "@/components/release/TrackList";
import { DonationBox } from "@/components/release/DonationBox";
import { ReleaseComments } from "@/components/release/ReleaseComments";
import { useAuth } from "@/hooks/useAuth";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFullAlbumListen } from "@/hooks/useFullAlbumListen";
import {
  ArrowLeft,
  Disc3,
  Calendar,
  Play,
  Share2,
  Loader2,
  Headphones,
} from "lucide-react";
import { format } from "date-fns";

interface TrackCommentary {
  id: string;
  commentary_text: string;
  commentary_audio_path: string | null;
  timestamp_notes_json: Record<string, string> | null;
}

interface Track {
  id: string;
  title: string;
  track_number: number;
  audio_path: string;
  duration_seconds: number | null;
  track_commentary: TrackCommentary[];
}

interface Release {
  id: string;
  title: string;
  type: string;
  description: string | null;
  cover_art_url: string | null;
  published_at: string | null;
  suggested_price_cents: number | null;
  streaming_requires_donation: boolean;
  artist: {
    id: string;
    name: string;
    image_url: string | null;
    bio: string | null;
  };
  tracks: Track[];
}

export default function Release() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { play, setFullListenMode } = usePlayer();
  const { activeSession, hasCompletedListen, startFullListenSession, cancelSession } = useFullAlbumListen();
  // Fetch release data
  const { data: release, isLoading } = useQuery({
    queryKey: ["release", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select(`
          id,
          title,
          type,
          description,
          cover_art_url,
          published_at,
          suggested_price_cents,
          streaming_requires_donation,
          artist:artists(id, name, image_url, bio),
          tracks(
            id,
            title,
            track_number,
            audio_path,
            duration_seconds,
            track_commentary(
              id,
              commentary_text,
              commentary_audio_path,
              timestamp_notes_json
            )
          )
        `)
        .eq("id", id)
        .eq("is_published", true)
        .single();

      if (error) throw error;
      
      // Sort tracks by track number
      const result = data as unknown as Release;
      if (result?.tracks) {
        result.tracks.sort((a, b) => a.track_number - b.track_number);
      }
      
      return result;
    },
    enabled: !!id,
  });

  // Check if user has unlocked downloads
  const { data: hasUnlockedDownloads } = useQuery({
    queryKey: ["donation-status", id, user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase
        .from("donations")
        .select("id")
        .eq("release_id", id)
        .eq("user_id", user.id)
        .eq("status", "paid")
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    },
    enabled: !!id && !!user,
  });

  const typeLabels = {
    album: "Album",
    single: "Single",
    ep: "EP",
  };

  const trackIds = release?.tracks?.map((t) => t.id) || [];

  const handlePlayAll = () => {
    if (!release?.tracks?.length) return;

    const playerTracks = release.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      track_number: track.track_number,
      audio_path: track.audio_path,
      duration_seconds: track.duration_seconds,
      release: {
        id: release.id,
        title: release.title,
        cover_art_url: release.cover_art_url,
        artist: { name: release.artist.name },
      },
    }));

    play(playerTracks[0], playerTracks);
  };

  const handleStartFullListen = () => {
    if (!release?.tracks?.length) return;

    const playerTracks = release.tracks.map((track) => ({
      id: track.id,
      title: track.title,
      track_number: track.track_number,
      audio_path: track.audio_path,
      duration_seconds: track.duration_seconds,
      release: {
        id: release.id,
        title: release.title,
        cover_art_url: release.cover_art_url,
        artist: { name: release.artist.name },
      },
    }));

    play(playerTracks[0], playerTracks);
  };
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h1 className="font-display text-2xl font-bold">Release Not Found</h1>
          <Button asChild>
            <Link to="/library">Back to Library</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero section with cover art */}
      <section className="pt-24 pb-8 px-4">
        <div className="container max-w-6xl">
          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6"
          >
            <Button variant="ghost" size="sm" asChild>
              <Link to="/library" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Library
              </Link>
            </Button>
          </motion.div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Cover art */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:w-80 flex-shrink-0"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden shadow-2xl shadow-primary/20">
                {release.cover_art_url ? (
                  <img
                    src={release.cover_art_url}
                    alt={release.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Disc3 className="w-24 h-24 text-muted-foreground" />
                  </div>
                )}
              </div>
            </motion.div>

            {/* Release info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1"
            >
              <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground mb-4">
                {typeLabels[release.type as keyof typeof typeLabels]}
              </span>

              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-2">
                {release.title}
              </h1>

              <Link
                to={`/artist/${release.artist.id}`}
                className="text-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                {release.artist.name}
              </Link>

              {release.published_at && (
                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(release.published_at), "MMMM d, yyyy")}</span>
                </div>
              )}

              {release.description && (
                <p className="mt-6 text-muted-foreground leading-relaxed">
                  {release.description}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 mt-8">
                <Button variant="hero" size="lg" className="gap-2" onClick={handlePlayAll}>
                  <Play className="w-4 h-4" />
                  Play All
                </Button>
                {activeSession?.releaseId === release.id ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="gap-2 border-primary text-primary"
                    onClick={cancelSession}
                  >
                    <Headphones className="w-4 h-4" />
                    Full Album Mode Active ({activeSession.completedTracks.size}/{activeSession.totalTracks})
                  </Button>
                ) : !hasCompletedListen(release.id) ? (
                  <Button
                    variant="glass"
                    size="lg"
                    className="gap-2"
                    onClick={() => {
                      startFullListenSession(release.id, trackIds);
                      handleStartFullListen();
                    }}
                  >
                    <Headphones className="w-4 h-4" />
                    Full Album Mode
                  </Button>
                ) : (
                  <Button
                    variant="glass"
                    size="lg"
                    className="gap-2 text-green-500 border-green-500"
                    disabled
                  >
                    <Headphones className="w-4 h-4" />
                    Album Completed ✓
                  </Button>
                )}
                <Button variant="glass" size="lg" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="py-8 px-4 pb-32">
        <div className="container max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Track list */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1"
            >
              <h2 className="font-display text-xl font-semibold mb-4">Tracks</h2>
              <div className="glass-card p-4">
                <TrackList
                  tracks={release.tracks}
                  release={{
                    id: release.id,
                    title: release.title,
                    cover_art_url: release.cover_art_url,
                    artist: { name: release.artist.name },
                  }}
                  hasUnlockedDownloads={hasUnlockedDownloads || false}
                />
              </div>

              {/* Album Comments Section */}
              <div className="mt-8">
                <ReleaseComments
                  releaseId={release.id}
                  releaseTitle={release.title}
                  trackIds={trackIds}
                  onStartFullListen={handleStartFullListen}
                />
              </div>
            </motion.div>

            {/* Sidebar with donation box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:w-80 space-y-6"
            >
              <DonationBox
                releaseId={release.id}
                releaseTitle={release.title}
                suggestedPriceCents={release.suggested_price_cents}
                hasUnlockedDownloads={hasUnlockedDownloads || false}
              />

              {/* Artist info card */}
              <div className="glass-card p-6">
                <h3 className="font-display font-semibold mb-3">About the Artist</h3>
                <div className="flex items-center gap-3 mb-4">
                  {release.artist.image_url ? (
                    <img
                      src={release.artist.image_url}
                      alt={release.artist.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="font-display font-bold text-lg">
                        {release.artist.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <h4 className="font-medium">{release.artist.name}</h4>
                  </div>
                </div>
                {release.artist.bio && (
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {release.artist.bio}
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
