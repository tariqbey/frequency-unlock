import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Music, Disc3, Loader2 } from "lucide-react";
import { FeaturedArtistCarousel } from "@/components/home/FeaturedArtistCarousel";
interface Release {
  id: string;
  title: string;
  type: string;
  description: string | null;
  cover_art_url: string | null;
  published_at: string | null;
  artist: {
    id: string;
    name: string;
    image_url: string | null;
  };
}

export default function Library() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

  // Fetch releases
  const { data: releases, isLoading: releasesLoading } = useQuery({
    queryKey: ["releases"],
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
          artist:artists(id, name, image_url)
        `)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Release[];
    },
  });

  // Fetch artists for filter
  const { data: artists } = useQuery({
    queryKey: ["artists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name, image_url")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Filter releases
  const filteredReleases = releases?.filter((release) => {
    const matchesSearch =
      !searchQuery ||
      release.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      release.artist?.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesArtist = !selectedArtist || release.artist?.id === selectedArtist;

    return matchesSearch && matchesArtist;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-32 px-4">
        <div className="container max-w-7xl">
          {/* Featured Artists Carousel */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6">
              Featured <span className="text-gradient">Artists</span>
            </h2>
            <FeaturedArtistCarousel />
          </motion.div>

          {/* Header */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Music <span className="text-gradient">Library</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse releases and discover new frequencies
            </p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            className="flex flex-col md:flex-row gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search releases or artists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedArtist === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedArtist(null)}
              >
                All Artists
              </Button>
              {artists?.slice(0, 5).map((artist) => (
                <Button
                  key={artist.id}
                  variant={selectedArtist === artist.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedArtist(artist.id)}
                >
                  {artist.name}
                </Button>
              ))}
            </div>
          </motion.div>

          {/* Releases Grid */}
          {releasesLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredReleases && filteredReleases.length > 0 ? (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 stagger-children"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {filteredReleases.map((release) => (
                <ReleaseCard key={release.id} release={release} />
              ))}
            </motion.div>
          ) : (
            <EmptyState hasReleases={!!releases?.length} />
          )}
        </div>
      </main>
    </div>
  );
}

function ReleaseCard({ release }: { release: Release }) {
  const typeLabels = {
    album: "Album",
    single: "Single",
    ep: "EP",
  };

  return (
    <Link to={`/release/${release.id}`} className="group">
      <motion.div className="release-card" whileHover={{ scale: 1.02 }}>
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
        <Link 
          to={`/artist/${release.artist?.id}`} 
          className="text-sm text-muted-foreground line-clamp-1 hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {release.artist?.name}
        </Link>
        <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
          {typeLabels[release.type as keyof typeof typeLabels]}
        </span>
      </motion.div>
    </Link>
  );
}

function EmptyState({ hasReleases }: { hasReleases: boolean }) {
  return (
    <motion.div
      className="text-center py-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
        <Music className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="font-display text-xl font-semibold mb-2">
        {hasReleases ? "No matching releases" : "No releases yet"}
      </h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        {hasReleases
          ? "Try adjusting your search or filters"
          : "Check back soon for new music from our artists"}
      </p>
    </motion.div>
  );
}
