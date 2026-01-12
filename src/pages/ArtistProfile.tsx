import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { User, Disc3, Music, Calendar, ArrowLeft, Loader2 } from "lucide-react";

interface Artist {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  created_at: string;
}

interface Release {
  id: string;
  title: string;
  type: string;
  description: string | null;
  cover_art_url: string | null;
  published_at: string | null;
  tracks: { id: string }[];
}

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();

  // Fetch artist
  const { data: artist, isLoading: artistLoading } = useQuery({
    queryKey: ["artist", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as Artist | null;
    },
    enabled: !!id,
  });

  // Fetch artist's releases
  const { data: releases, isLoading: releasesLoading } = useQuery({
    queryKey: ["artist-releases", id],
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
          tracks(id)
        `)
        .eq("artist_id", id)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as Release[];
    },
    enabled: !!id,
  });

  const isLoading = artistLoading || releasesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 text-center">
          <h1 className="font-display text-2xl font-bold">Artist not found</h1>
          <Link to="/library">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Library
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalTracks = releases?.reduce((sum, r) => sum + (r.tracks?.length || 0), 0) || 0;
  const typeLabels: Record<string, string> = {
    album: "Album",
    single: "Single",
    ep: "EP",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-32">
        {/* Hero Section */}
        <div className="relative">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background h-[400px]" />
          
          <div className="container max-w-6xl relative px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row items-center md:items-end gap-8 pt-16"
            >
              {/* Artist Image */}
              <div className="relative">
                {artist.image_url ? (
                  <img
                    src={artist.image_url}
                    alt={artist.name}
                    className="w-48 h-48 md:w-56 md:h-56 rounded-full object-cover border-4 border-background shadow-2xl"
                  />
                ) : (
                  <div className="w-48 h-48 md:w-56 md:h-56 rounded-full bg-muted flex items-center justify-center border-4 border-background shadow-2xl">
                    <User className="w-20 h-20 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Music className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>

              {/* Artist Info */}
              <div className="text-center md:text-left pb-4">
                <p className="text-sm text-primary font-medium mb-2">Artist</p>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                  {artist.name}
                </h1>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Disc3 className="w-4 h-4" />
                    {releases?.length || 0} Releases
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Music className="w-4 h-4" />
                    {totalTracks} Tracks
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Since {new Date(artist.created_at).getFullYear()}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="container max-w-6xl px-4 mt-12">
          {/* Bio Section */}
          {artist.bio && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-12"
            >
              <h2 className="font-display text-xl font-semibold mb-4">About</h2>
              <div className="glass-panel p-6 rounded-xl">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {artist.bio}
                </p>
              </div>
            </motion.section>
          )}

          {/* Discography Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="font-display text-xl font-semibold mb-6">Discography</h2>
            
            {releases && releases.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {releases.map((release, index) => (
                  <motion.div
                    key={release.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <Link to={`/release/${release.id}`} className="group block">
                      <div className="release-card">
                        {/* Cover Art */}
                        <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                          {release.cover_art_url ? (
                            <img
                              src={release.cover_art_url}
                              alt={release.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Disc3 className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}

                          {/* Play overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                              <Music className="w-5 h-5 text-primary-foreground" />
                            </div>
                          </div>
                        </div>

                        {/* Info */}
                        <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {release.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {release.published_at
                              ? new Date(release.published_at).getFullYear()
                              : "—"}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                            {typeLabels[release.type] || release.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {release.tracks?.length || 0} tracks
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-xl text-center">
                <Disc3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No releases yet</p>
              </div>
            )}
          </motion.section>
        </div>
      </main>
    </div>
  );
}
