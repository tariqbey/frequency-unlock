import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabNav } from "@/components/layout/BottomTabNav";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Disc3, Loader2, Play, Pause, SkipForward, Download, ChevronRight } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

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

// Dummy data used when no real releases are available
const dummyReleases: Release[] = [
  { id: "d1", title: "Lost in Paradise", type: "album", description: null, cover_art_url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop", published_at: null, artist: { id: "a1", name: "Luna Waves", image_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop" } },
  { id: "d2", title: "Chill Out", type: "album", description: null, cover_art_url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=400&h=400&fit=crop", published_at: null, artist: { id: "a2", name: "Prolestorhea", image_url: null } },
  { id: "d3", title: "Smooth Jazz", type: "single", description: null, cover_art_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&h=400&fit=crop", published_at: null, artist: { id: "a3", name: "Jazz Masters", image_url: null } },
  { id: "d4", title: "Acoustic Evening", type: "ep", description: null, cover_art_url: "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=400&fit=crop", published_at: null, artist: { id: "a4", name: "Evening", image_url: null } },
  { id: "d5", title: "Urban Beats", type: "album", description: null, cover_art_url: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop", published_at: null, artist: { id: "a5", name: "BeatMaker", image_url: null } },
  { id: "d6", title: "Midnight Drive", type: "single", description: null, cover_art_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&h=400&fit=crop", published_at: null, artist: { id: "a6", name: "Neon Pulse", image_url: null } },
];

export default function Library() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: releases, isLoading } = useQuery({
    queryKey: ["releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select(`
          id, title, type, description, cover_art_url, published_at,
          artist:artists(id, name, image_url)
        `)
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Release[];
    },
  });

  const allReleases = releases && releases.length > 0 ? releases : dummyReleases;

  const filtered = allReleases.filter(
    (r) =>
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.artist?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const continueListening = filtered.slice(0, 4);
  const recentlyDownloaded = filtered.slice(1, 5);
  const relaxUnwind = filtered.slice(0, 6);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop navbar */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      <main className="pt-4 md:pt-24 pb-40 md:pb-32 px-4 md:px-0">
        <div className="container max-w-7xl">
          {/* ===== Mobile Header: Centered logo + search icon ===== */}
          <div className="flex flex-col items-center mb-6 md:hidden relative">
            {/* Search icon top-right */}
            <button className="absolute right-0 top-4 p-2 text-muted-foreground hover:text-foreground">
              <Search className="w-5 h-5" />
            </button>
            <Logo size="xxl" showTagline={false} />
          </div>

          {/* ===== Desktop header ===== */}
          <div className="hidden md:block mb-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-4">
                Music <span className="text-gradient">Library</span>
              </h1>
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search releases or artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50"
                />
              </div>
            </motion.div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-7">
              {/* Continue Listening — large cards with play overlay */}
              <ContinueListeningSection releases={continueListening} />

              {/* Recently Downloaded — smaller cards with title overlay */}
              <RecentlyDownloadedSection releases={recentlyDownloaded} />

              {/* Relax & Unwind — list row with playback controls */}
              <RelaxUnwindSection releases={relaxUnwind} />
            </div>
          )}
        </div>
      </main>

      <div className="md:hidden">
        <BottomTabNav />
      </div>
    </div>
  );
}

/* ─── Continue Listening ─────────────────────────────────────── */
function ContinueListeningSection({ releases }: { releases: Release[] }) {
  if (!releases.length) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold text-foreground">Continue Listening</h2>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:overflow-visible">
        {releases.map((release) => (
          <Link
            key={release.id}
            to={`/release/${release.id}`}
            className="w-40 min-w-[10rem] md:w-auto flex-shrink-0 group"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-2">
              {release.cover_art_url ? (
                <img
                  src={release.cover_art_url}
                  alt={release.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Disc3 className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              {/* Play button overlay */}
              <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-primary flex items-center justify-center opacity-90 group-hover:opacity-100 transition-opacity shadow-lg">
                <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
              </div>
            </div>
            <p className="text-sm font-medium line-clamp-1 text-foreground group-hover:text-primary transition-colors">
              {release.title}
            </p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {release.artist?.name}
            </p>
          </Link>
        ))}
      </div>
    </motion.section>
  );
}

/* ─── Recently Downloaded ────────────────────────────────────── */
function RecentlyDownloadedSection({ releases }: { releases: Release[] }) {
  if (!releases.length) return null;
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold text-foreground">Recently Downloaded</h2>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 md:overflow-visible">
        {releases.map((release) => (
          <Link
            key={release.id}
            to={`/release/${release.id}`}
            className="w-28 min-w-[7rem] md:w-auto flex-shrink-0 group"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted mb-1.5">
              {release.cover_art_url ? (
                <img
                  src={release.cover_art_url}
                  alt={release.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Disc3 className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              {/* Title + download badge overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                <p className="text-xs font-semibold text-white line-clamp-1">{release.title}</p>
              </div>
              <div className="absolute bottom-1.5 right-1.5">
                <Download className="w-3.5 h-3.5 text-white/80" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {release.artist?.name}
            </p>
          </Link>
        ))}
      </div>
    </motion.section>
  );
}

/* ─── Relax & Unwind ─────────────────────────────────────────── */
function RelaxUnwindSection({ releases }: { releases: Release[] }) {
  if (!releases.length) return null;
  const featured = releases[0];
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-bold text-foreground">Relax & Unwind</h2>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>
      {/* Featured track row */}
      <Link
        to={`/release/${featured.id}`}
        className="flex items-center gap-3 p-3 rounded-xl bg-card/60 backdrop-blur border border-border/40 group hover:border-primary/40 transition-all"
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {featured.cover_art_url ? (
            <img src={featured.cover_art_url} alt={featured.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground line-clamp-1">{featured.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{featured.artist?.name}</p>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Pause className="w-5 h-5 text-foreground" />
          <SkipForward className="w-5 h-5" />
        </div>
      </Link>
    </motion.section>
  );
}
