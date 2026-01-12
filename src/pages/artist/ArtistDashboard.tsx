import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArtistLayout } from "@/components/artist/ArtistLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Disc3, Music, Play, DollarSign, Plus, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ArtistDashboard() {
  const { profile } = useAuth();

  // Fetch artist's releases
  const { data: releases, isLoading: releasesLoading } = useQuery({
    queryKey: ["artist-releases", profile?.artist_id],
    queryFn: async () => {
      if (!profile?.artist_id) return [];
      const { data, error } = await supabase
        .from("releases")
        .select("*")
        .eq("artist_id", profile.artist_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.artist_id,
  });

  // Fetch artist's tracks
  const { data: tracks, isLoading: tracksLoading } = useQuery({
    queryKey: ["artist-tracks", profile?.artist_id],
    queryFn: async () => {
      if (!profile?.artist_id) return [];
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          *,
          release:releases!inner(artist_id)
        `)
        .eq("release.artist_id", profile.artist_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.artist_id,
  });

  // Fetch play events for artist's tracks
  const { data: playCount } = useQuery({
    queryKey: ["artist-plays", profile?.artist_id],
    queryFn: async () => {
      if (!profile?.artist_id) return 0;
      const { data, error } = await supabase
        .from("events")
        .select("id, release:releases!inner(artist_id)")
        .eq("event_type", "play_start")
        .eq("release.artist_id", profile.artist_id);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!profile?.artist_id,
  });

  // Fetch donations for artist's releases
  const { data: donations } = useQuery({
    queryKey: ["artist-donations", profile?.artist_id],
    queryFn: async () => {
      if (!profile?.artist_id) return { count: 0, total: 0 };
      const { data, error } = await supabase
        .from("donations")
        .select("amount_cents, release:releases!inner(artist_id)")
        .eq("status", "paid")
        .eq("release.artist_id", profile.artist_id);
      if (error) throw error;
      const total = data?.reduce((sum, d) => sum + d.amount_cents, 0) || 0;
      return { count: data?.length || 0, total };
    },
    enabled: !!profile?.artist_id,
  });

  const isLoading = releasesLoading || tracksLoading;
  const publishedReleases = releases?.filter((r) => r.is_published) || [];
  const draftReleases = releases?.filter((r) => !r.is_published) || [];

  if (!profile?.artist_id) {
    return (
      <ArtistLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Disc3 className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Artist Profile Linked</h1>
          <p className="text-muted-foreground max-w-md">
            Your account doesn't have an artist profile linked yet. Please contact an administrator to set up your artist profile.
          </p>
        </div>
      </ArtistLayout>
    );
  }

  return (
    <ArtistLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your music
            </p>
          </div>
          <Button asChild>
            <Link to="/artist/releases">
              <Plus className="w-4 h-4 mr-2" />
              New Release
            </Link>
          </Button>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total Releases"
              value={releases?.length || 0}
              icon={<Disc3 className="w-6 h-6" />}
              change={`${publishedReleases.length} published, ${draftReleases.length} drafts`}
              changeType="neutral"
            />
            <StatsCard
              title="Total Tracks"
              value={tracks?.length || 0}
              icon={<Music className="w-6 h-6" />}
            />
            <StatsCard
              title="Total Plays"
              value={playCount || 0}
              icon={<Play className="w-6 h-6" />}
            />
            <StatsCard
              title="Donations Received"
              value={`$${((donations?.total || 0) / 100).toFixed(2)}`}
              icon={<DollarSign className="w-6 h-6" />}
              change={`${donations?.count || 0} donations`}
              changeType="neutral"
            />
          </div>
        )}

        {/* Recent Releases */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Releases
              <Button variant="ghost" size="sm" asChild>
                <Link to="/artist/releases">View All</Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {releases && releases.length > 0 ? (
              <div className="space-y-4">
                {releases.slice(0, 5).map((release, index) => (
                  <motion.div
                    key={release.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4"
                  >
                    {release.cover_art_url ? (
                      <img
                        src={release.cover_art_url}
                        alt={release.title}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <Disc3 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{release.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(release.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        release.is_published
                          ? "bg-green-500/20 text-green-400"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {release.is_published ? "Published" : "Draft"}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Disc3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">No releases yet</p>
                <Button asChild>
                  <Link to="/artist/releases">Create Your First Release</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ArtistLayout>
  );
}
