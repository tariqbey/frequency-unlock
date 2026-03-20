import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFullAlbumListen } from "@/hooks/useFullAlbumListen";
import { useAuth } from "@/hooks/useAuth";
import {
  Headphones,
  Lock,
  Unlock,
  X,
  Play,
  CheckCircle2,
  Music,
} from "lucide-react";

interface FullListenPromptProps {
  releaseId: string;
  releaseTitle: string;
  trackIds: string[];
  onStartFullListen: () => void;
}

export function FullListenPrompt({
  releaseId,
  releaseTitle,
  trackIds,
  onStartFullListen,
}: FullListenPromptProps) {
  const { user } = useAuth();
  const {
    hasCompletedListen,
    startFullListenSession,
    activeSession,
    cancelSession,
    getProgress,
    isLoading,
  } = useFullAlbumListen();

  const hasCompleted = hasCompletedListen(releaseId);
  const isActiveForThisRelease = activeSession?.releaseId === releaseId;
  const progress = getProgress();

  if (!user) {
    return (
      <div className="glass-card p-4 sm:p-6 text-center">
        <Lock className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
        <h3 className="font-display font-semibold text-sm sm:text-base mb-1 sm:mb-2">Sign in to Comment</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Sign in and complete a full album listen to unlock comments.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="glass-card p-6 text-center animate-pulse">
        <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-muted" />
        <div className="h-4 bg-muted rounded w-32 mx-auto mb-2" />
        <div className="h-3 bg-muted rounded w-48 mx-auto" />
      </div>
    );
  }

  // User has already completed a full listen
  if (hasCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-4 sm:p-6 border-green-500/30 bg-green-500/5"
      >
        <div className="flex items-center gap-3 text-green-400">
          <Unlock className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
          <div>
            <h3 className="font-display font-semibold text-sm sm:text-base">Comments Unlocked!</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              You've completed a full listen of this album.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Active full listen session for this release
  if (isActiveForThisRelease) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-4 sm:p-6 border-primary/30"
      >
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-shrink-0">
              <Headphones className="w-5 h-5 sm:w-6 sm:h-6 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm sm:text-base">Full Album Mode Active</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Listen without skipping to unlock comments
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelSession}
            className="text-muted-foreground hover:text-foreground flex-shrink-0 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {progress.completed} / {progress.total} tracks
            </span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          <span>Tracks will auto-advance. No skipping or fast-forwarding allowed.</span>
        </div>
      </motion.div>
    );
  }

  // Prompt to start full listen
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
        </div>
        <div className="flex-1 w-full">
          <h3 className="font-display font-semibold text-sm sm:text-base mb-1">
            Unlock Comments with a Full Listen
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mb-4">
            To share your thoughts on "{releaseTitle}", listen to the complete album
            without skipping or fast-forwarding. This ensures meaningful engagement from dedicated listeners.
          </p>

          <div className="flex items-center gap-3 mb-4 text-xs sm:text-sm text-muted-foreground">
            <Music className="w-4 h-4" />
            <span>{trackIds.length} tracks</span>
          </div>

          <Button
            onClick={() => {
              startFullListenSession(releaseId, trackIds);
              onStartFullListen();
            }}
            className="gap-2 w-full sm:w-auto"
            size="sm"
          >
            <Play className="w-4 h-4" />
            Start Full Album Listen
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
