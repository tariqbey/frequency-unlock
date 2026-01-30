import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface FavoriteTrack {
  id: string;
  track_id: string;
  created_at: string;
}

interface FavoriteRelease {
  id: string;
  release_id: string;
  created_at: string;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteTrackIds, setFavoriteTrackIds] = useState<Set<string>>(new Set());
  const [favoriteReleaseIds, setFavoriteReleaseIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites on mount and when user changes
  useEffect(() => {
    async function loadFavorites() {
      if (!user) {
        setFavoriteTrackIds(new Set());
        setFavoriteReleaseIds(new Set());
        setIsLoading(false);
        return;
      }

      try {
        const [tracksRes, releasesRes] = await Promise.all([
          supabase
            .from("favorite_tracks")
            .select("track_id")
            .eq("user_id", user.id),
          supabase
            .from("favorite_releases")
            .select("release_id")
            .eq("user_id", user.id),
        ]);

        if (tracksRes.error) throw tracksRes.error;
        if (releasesRes.error) throw releasesRes.error;

        setFavoriteTrackIds(new Set(tracksRes.data.map((t) => t.track_id)));
        setFavoriteReleaseIds(new Set(releasesRes.data.map((r) => r.release_id)));
      } catch (error) {
        console.error("Error loading favorites:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFavorites();
  }, [user]);

  const isTrackFavorited = useCallback(
    (trackId: string) => favoriteTrackIds.has(trackId),
    [favoriteTrackIds]
  );

  const isReleaseFavorited = useCallback(
    (releaseId: string) => favoriteReleaseIds.has(releaseId),
    [favoriteReleaseIds]
  );

  const toggleTrackFavorite = useCallback(
    async (trackId: string) => {
      if (!user) {
        toast.error("Please sign in to save favorites");
        return;
      }

      const isFavorited = favoriteTrackIds.has(trackId);

      // Optimistic update
      setFavoriteTrackIds((prev) => {
        const next = new Set(prev);
        if (isFavorited) {
          next.delete(trackId);
        } else {
          next.add(trackId);
        }
        return next;
      });

      try {
        if (isFavorited) {
          const { error } = await supabase
            .from("favorite_tracks")
            .delete()
            .eq("user_id", user.id)
            .eq("track_id", trackId);

          if (error) throw error;
          toast.success("Removed from favorites");
        } else {
          const { error } = await supabase
            .from("favorite_tracks")
            .insert({ user_id: user.id, track_id: trackId });

          if (error) throw error;
          toast.success("Added to favorites");
        }
      } catch (error) {
        // Revert on error
        setFavoriteTrackIds((prev) => {
          const next = new Set(prev);
          if (isFavorited) {
            next.add(trackId);
          } else {
            next.delete(trackId);
          }
          return next;
        });
        console.error("Error toggling favorite:", error);
        toast.error("Failed to update favorites");
      }
    },
    [user, favoriteTrackIds]
  );

  const toggleReleaseFavorite = useCallback(
    async (releaseId: string) => {
      if (!user) {
        toast.error("Please sign in to save favorites");
        return;
      }

      const isFavorited = favoriteReleaseIds.has(releaseId);

      // Optimistic update
      setFavoriteReleaseIds((prev) => {
        const next = new Set(prev);
        if (isFavorited) {
          next.delete(releaseId);
        } else {
          next.add(releaseId);
        }
        return next;
      });

      try {
        if (isFavorited) {
          const { error } = await supabase
            .from("favorite_releases")
            .delete()
            .eq("user_id", user.id)
            .eq("release_id", releaseId);

          if (error) throw error;
          toast.success("Removed from favorites");
        } else {
          const { error } = await supabase
            .from("favorite_releases")
            .insert({ user_id: user.id, release_id: releaseId });

          if (error) throw error;
          toast.success("Added to favorites");
        }
      } catch (error) {
        // Revert on error
        setFavoriteReleaseIds((prev) => {
          const next = new Set(prev);
          if (isFavorited) {
            next.add(releaseId);
          } else {
            next.delete(releaseId);
          }
          return next;
        });
        console.error("Error toggling favorite:", error);
        toast.error("Failed to update favorites");
      }
    },
    [user, favoriteReleaseIds]
  );

  return {
    favoriteTrackIds,
    favoriteReleaseIds,
    isLoading,
    isTrackFavorited,
    isReleaseFavorited,
    toggleTrackFavorite,
    toggleReleaseFavorite,
  };
}
