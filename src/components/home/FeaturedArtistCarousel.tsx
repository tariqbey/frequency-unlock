import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Play, Disc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect, useCallback } from "react";

interface FeaturedArtist {
  id: string;
  name: string;
  image_url: string | null;
  latestRelease: {
    id: string;
    title: string;
    cover_art_url: string | null;
  } | null;
}

const AUTO_SCROLL_INTERVAL = 4000; // 4 seconds
const SCROLL_AMOUNT = 288; // width of card (72 * 4) + gap

export function FeaturedArtistCarousel() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);

  const { data: artists, isLoading } = useQuery({
    queryKey: ["featured-artists"],
    queryFn: async () => {
      // Get artists with published releases
      const { data: artistsData, error: artistsError } = await supabase
        .from("artists")
        .select("id, name, image_url")
        .order("created_at", { ascending: false })
        .limit(10);

      if (artistsError) throw artistsError;

      // Get latest release for each artist
      const artistIds = artistsData?.map((a) => a.id) || [];
      const { data: releases, error: releasesError } = await supabase
        .from("releases")
        .select("id, title, cover_art_url, artist_id")
        .in("artist_id", artistIds)
        .eq("is_published", true)
        .order("published_at", { ascending: false });

      if (releasesError) throw releasesError;

      // Map artists with their latest release
      return artistsData?.map((artist) => ({
        ...artist,
        latestRelease: releases?.find((r) => r.artist_id === artist.id) || null,
      })) as FeaturedArtist[];
    },
  });

  const checkScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  }, []);

  const scroll = useCallback((direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      const atEnd = scrollLeft >= scrollWidth - clientWidth - 10;
      
      if (direction === "right" && atEnd) {
        // Loop back to start
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({
          left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
          behavior: "smooth",
        });
      }
      setTimeout(checkScroll, 300);
    }
  }, [checkScroll]);

  // Filter to only show artists with releases
  const featuredArtists = artists?.filter((a) => a.latestRelease) || [];

  // Auto-scroll effect
  useEffect(() => {
    if (featuredArtists.length <= 3) return;

    const startAutoScroll = () => {
      autoScrollRef.current = setInterval(() => {
        if (!isPaused) {
          scroll("right");
        }
      }, AUTO_SCROLL_INTERVAL);
    };

    startAutoScroll();

    return () => {
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
      }
    };
  }, [isPaused, scroll, featuredArtists.length]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);

  if (isLoading) {
    return (
      <div className="flex gap-6 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-72 animate-pulse">
            <div className="aspect-square rounded-2xl bg-muted" />
            <div className="mt-4 h-5 bg-muted rounded w-3/4" />
            <div className="mt-2 h-4 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (featuredArtists.length === 0) {
    return null;
  }

  return (
    <div 
      className="relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Scroll buttons */}
      {canScrollLeft && (
        <Button
          variant="glass"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
      )}
      {canScrollRight && featuredArtists.length > 3 && (
        <Button
          variant="glass"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1/2"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      )}

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {featuredArtists.map((artist, index) => (
          <motion.div
            key={artist.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="flex-shrink-0 w-72"
          >
            <Link
              to={artist.latestRelease ? `/release/${artist.latestRelease.id}` : `/artist/${artist.id}`}
              className="block group/card"
            >
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
                {artist.latestRelease?.cover_art_url ? (
                  <img
                    src={artist.latestRelease.cover_art_url}
                    alt={artist.latestRelease.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                  />
                ) : artist.image_url ? (
                  <img
                    src={artist.image_url}
                    alt={artist.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                    <Disc className="w-20 h-20 text-muted-foreground" />
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />

                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300">
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-xl transform scale-90 group-hover/card:scale-100 transition-transform">
                    <Play className="w-7 h-7 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="font-semibold text-lg truncate group-hover/card:text-primary transition-colors">
                  {artist.name}
                </h3>
                {artist.latestRelease && (
                  <p className="text-sm text-muted-foreground truncate">
                    {artist.latestRelease.title}
                  </p>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
