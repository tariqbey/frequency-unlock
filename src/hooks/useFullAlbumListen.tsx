import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface FullListenSession {
  releaseId: string;
  totalTracks: number;
  completedTracks: Set<string>;
  currentTrackIndex: number;
  isActive: boolean;
  startedAt: Date;
}

interface FullAlbumListenContextType {
  // Current session state
  activeSession: FullListenSession | null;
  
  // Check if user has completed a full listen for a release
  hasCompletedListen: (releaseId: string) => boolean;
  
  // Start a full listen session
  startFullListenSession: (releaseId: string, trackIds: string[]) => void;
  
  // Cancel the current session
  cancelSession: () => void;
  
  // Mark a track as completed (called when track finishes naturally)
  markTrackCompleted: (trackId: string) => void;
  
  // Check if skipping is allowed
  canSkip: () => boolean;
  
  // Handle skip attempt - returns true if allowed, false if blocked
  attemptSkip: () => boolean;
  
  // Get completion progress
  getProgress: () => { completed: number; total: number; percentage: number };
  
  // Completed releases (loaded from DB)
  completedReleases: Set<string>;
  
  // Loading state
  isLoading: boolean;
}

const FullAlbumListenContext = createContext<FullAlbumListenContextType | undefined>(undefined);

export function FullAlbumListenProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<FullListenSession | null>(null);
  const [completedReleases, setCompletedReleases] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [trackOrder, setTrackOrder] = useState<string[]>([]);

  // Load completed releases from database
  useEffect(() => {
    async function loadCompletedReleases() {
      if (!user) {
        setCompletedReleases(new Set());
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("album_listen_completions")
          .select("release_id")
          .eq("user_id", user.id);

        if (error) throw error;

        const releaseIds = new Set(data?.map((d) => d.release_id) || []);
        setCompletedReleases(releaseIds);
      } catch (error) {
        console.error("Error loading completed releases:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompletedReleases();
  }, [user]);

  const hasCompletedListen = useCallback(
    (releaseId: string) => {
      return completedReleases.has(releaseId);
    },
    [completedReleases]
  );

  const startFullListenSession = useCallback(
    (releaseId: string, trackIds: string[]) => {
      if (!user) {
        toast.error("Please sign in to start a full album listen");
        return;
      }

      if (hasCompletedListen(releaseId)) {
        toast.info("You've already completed a full listen of this album!");
        return;
      }

      setTrackOrder(trackIds);
      setActiveSession({
        releaseId,
        totalTracks: trackIds.length,
        completedTracks: new Set(),
        currentTrackIndex: 0,
        isActive: true,
        startedAt: new Date(),
      });

      toast.success("Full Album Mode activated! Listen to all tracks to unlock comments.", {
        duration: 5000,
      });
    },
    [user, hasCompletedListen]
  );

  const cancelSession = useCallback(() => {
    if (activeSession) {
      toast.info("Full Album Mode cancelled. Comments remain locked for this album.");
    }
    setActiveSession(null);
    setTrackOrder([]);
  }, [activeSession]);

  const markTrackCompleted = useCallback(
    async (trackId: string) => {
      if (!activeSession || !user) return;

      const newCompletedTracks = new Set(activeSession.completedTracks);
      newCompletedTracks.add(trackId);

      const newSession = {
        ...activeSession,
        completedTracks: newCompletedTracks,
        currentTrackIndex: activeSession.currentTrackIndex + 1,
      };

      setActiveSession(newSession);

      // Check if all tracks are completed
      if (newCompletedTracks.size >= activeSession.totalTracks) {
        // Save completion to database
        try {
          const { error } = await supabase.from("album_listen_completions").insert({
            user_id: user.id,
            release_id: activeSession.releaseId,
          });

          if (error && !error.message.includes("duplicate")) {
            throw error;
          }

          // Update local state
          setCompletedReleases((prev) => new Set([...prev, activeSession.releaseId]));

          toast.success("🎉 Congratulations! You've completed the full album. Comments are now unlocked!", {
            duration: 6000,
          });

          setActiveSession(null);
          setTrackOrder([]);
        } catch (error) {
          console.error("Error saving completion:", error);
          toast.error("Failed to save your progress. Please try again.");
        }
      } else {
        const remaining = activeSession.totalTracks - newCompletedTracks.size;
        toast.info(`Track complete! ${remaining} more to go.`);
      }
    },
    [activeSession, user]
  );

  const canSkip = useCallback(() => {
    // Skipping is allowed even during full listen sessions
    return true;
  }, []);

  const attemptSkip = useCallback(() => {
    // Always allow skipping
    return true;
  }, []);

  const getProgress = useCallback(() => {
    if (!activeSession) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const completed = activeSession.completedTracks.size;
    const total = activeSession.totalTracks;
    const percentage = total > 0 ? (completed / total) * 100 : 0;

    return { completed, total, percentage };
  }, [activeSession]);

  return (
    <FullAlbumListenContext.Provider
      value={{
        activeSession,
        hasCompletedListen,
        startFullListenSession,
        cancelSession,
        markTrackCompleted,
        canSkip,
        attemptSkip,
        getProgress,
        completedReleases,
        isLoading,
      }}
    >
      {children}
    </FullAlbumListenContext.Provider>
  );
}

export function useFullAlbumListen() {
  const context = useContext(FullAlbumListenContext);
  if (context === undefined) {
    throw new Error("useFullAlbumListen must be used within a FullAlbumListenProvider");
  }
  return context;
}
