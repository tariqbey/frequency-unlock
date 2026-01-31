import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Play, Disc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";

interface FeaturedItem {
  id: string;
  type: "artist" | "release";
  name: string;
  artistName?: string;
  image_url: string | null;
  releaseId?: string;
  releaseTitle?: string;
  cover_art_url?: string | null;
}

const AUTO_ROTATE_INTERVAL = 5000; // 5 seconds

export function FeaturedArtistCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const { data: featuredItems, isLoading } = useQuery({
    queryKey: ["featured-carousel"],
    queryFn: async () => {
      const items: FeaturedItem[] = [];

      // Fetch featured releases
      const { data: featuredReleases, error: releasesError } = await supabase
        .from("releases")
        .select(`
          id,
          title,
          cover_art_url,
          artists (id, name)
        `)
        .eq("is_featured", true)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (releasesError) throw releasesError;

      featuredReleases?.forEach((release) => {
        items.push({
          id: `release-${release.id}`,
          type: "release",
          name: release.title,
          artistName: (release.artists as any)?.name,
          image_url: release.cover_art_url,
          releaseId: release.id,
          releaseTitle: release.title,
          cover_art_url: release.cover_art_url,
        });
      });

      // Fetch featured artists with their latest release
      const { data: featuredArtists, error: artistsError } = await supabase
        .from("artists")
        .select("id, name, image_url")
        .eq("is_featured", true)
        .order("created_at", { ascending: false });

      if (artistsError) throw artistsError;

      if (featuredArtists?.length) {
        const artistIds = featuredArtists.map((a) => a.id);
        const { data: artistReleases } = await supabase
          .from("releases")
          .select("id, title, cover_art_url, artist_id")
          .in("artist_id", artistIds)
          .eq("is_published", true)
          .order("published_at", { ascending: false });

        featuredArtists.forEach((artist) => {
          const latestRelease = artistReleases?.find((r) => r.artist_id === artist.id);
          // Only add artist if they have a release and aren't already featured via a release
          if (latestRelease) {
            const alreadyHasFeaturedRelease = items.some(
              (item) => item.type === "release" && item.artistName === artist.name
            );
            if (!alreadyHasFeaturedRelease) {
              items.push({
                id: `artist-${artist.id}`,
                type: "artist",
                name: artist.name,
                image_url: artist.image_url,
                releaseId: latestRelease.id,
                releaseTitle: latestRelease.title,
                cover_art_url: latestRelease.cover_art_url,
              });
            }
          }
        });
      }

      return items;
    },
  });

  const items = featuredItems || [];

  const goToNext = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goToPrev = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  // Auto-rotate effect
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    const interval = setInterval(goToNext, AUTO_ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, [isPaused, goToNext, items.length]);

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <div className="w-full max-w-2xl animate-pulse">
          <div className="aspect-square rounded-3xl bg-muted" />
          <div className="mt-6 h-8 bg-muted rounded w-3/4 mx-auto" />
          <div className="mt-3 h-5 bg-muted rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Navigation buttons */}
      {items.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 bg-background/60 backdrop-blur-sm hover:bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={goToPrev}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 bg-background/60 backdrop-blur-sm hover:bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={goToNext}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </>
      )}

      {/* Main carousel */}
      <div className="relative flex justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="w-full max-w-lg sm:max-w-xl md:max-w-2xl"
          >
            <Link
              to={currentItem.releaseId ? `/release/${currentItem.releaseId}` : `/artist/${currentItem.id.replace('artist-', '')}`}
              className="block group/card"
            >
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-muted shadow-2xl">
                {currentItem.cover_art_url ? (
                  <img
                    src={currentItem.cover_art_url}
                    alt={currentItem.releaseTitle || currentItem.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                  />
                ) : currentItem.image_url ? (
                  <img
                    src={currentItem.image_url}
                    alt={currentItem.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <Disc className="w-32 h-32 text-muted-foreground" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {/* Album info at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                  <h3 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl text-white truncate group-hover/card:text-primary transition-colors">
                    {currentItem.releaseTitle || currentItem.name}
                  </h3>
                  <p className="text-base sm:text-lg text-white/80 truncate mt-1">
                    {currentItem.type === "release" ? currentItem.artistName : currentItem.name}
                  </p>
                </div>

                {/* Play button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-xl transform scale-90 group-hover/card:scale-100 transition-transform glow-primary">
                    <Play className="w-10 h-10 sm:w-12 sm:h-12 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/40 hover:bg-muted-foreground/60"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
