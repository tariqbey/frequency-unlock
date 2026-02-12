import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabNav } from "@/components/layout/BottomTabNav";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Disc3, Loader2 } from "lucide-react";
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

  const filtered = releases?.filter(
    (r) =>
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.artist?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split into sections
  const continueListening = filtered?.slice(0, 4) ?? [];
  const recentlyDownloaded = filtered?.slice(2, 6) ?? [];
  const relaxUnwind = filtered?.slice(4, 10) ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop navbar - hidden on mobile */}
      <div className="hidden md:block">
        <Navbar />
      </div>

      <main className="pt-6 md:pt-24 pb-36 md:pb-32 px-4 md:px-0">
        <div className="container max-w-7xl">
          {/* Mobile header */}
          <div className="flex items-center justify-between mb-6 md:hidden">
            <Logo size="md" />
            <Link to="/library" className="p-2 text-muted-foreground hover:text-foreground">
              <Search className="w-5 h-5" />
            </Link>
          </div>

          {/* Desktop search */}
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
            <div className="space-y-8">
              {/* Continue Listening */}
              <Section title="Continue Listening" releases={continueListening} />

              {/* Recently Downloaded */}
              <Section title="Recently Downloaded" releases={recentlyDownloaded} cardSize="sm" />

              {/* Relax & Unwind */}
              <Section title="Relax & Unwind" releases={relaxUnwind} />
            </div>
          )}
        </div>
      </main>

      {/* Bottom tab nav - mobile only */}
      <div className="md:hidden">
        <BottomTabNav />
      </div>
    </div>
  );
}

function Section({
  title,
  releases,
  cardSize = "md",
}: {
  title: string;
  releases: Release[];
  cardSize?: "sm" | "md";
}) {
  if (!releases.length) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="font-display text-lg md:text-2xl font-bold mb-4 text-foreground">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:overflow-visible">
        {releases.map((release) => (
          <HorizontalCard key={release.id} release={release} size={cardSize} />
        ))}
      </div>
    </motion.section>
  );
}

function HorizontalCard({
  release,
  size,
}: {
  release: Release;
  size: "sm" | "md";
}) {
  const w = size === "sm" ? "w-28 min-w-[7rem]" : "w-36 min-w-[9rem]";
  return (
    <Link to={`/release/${release.id}`} className={`${w} flex-shrink-0 group`}>
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
            <Disc3 className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>
      <p className="text-sm font-medium line-clamp-1 text-foreground group-hover:text-primary transition-colors">
        {release.title}
      </p>
      <p className="text-xs text-muted-foreground line-clamp-1">
        {release.artist?.name}
      </p>
    </Link>
  );
}
