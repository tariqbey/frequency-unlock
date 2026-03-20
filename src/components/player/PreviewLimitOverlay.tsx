import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Lock, Heart, X } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { useNavigate } from "react-router-dom";

export function PreviewLimitOverlay() {
  const { currentTrack, previewLimitReached, dismissPreviewPrompt } = usePlayer();
  const navigate = useNavigate();

  if (!previewLimitReached || !currentTrack) return null;

  const handleDonate = () => {
    dismissPreviewPrompt();
    navigate(`/release/${currentTrack.release.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="glass-card p-6 sm:p-8 max-w-md w-full text-center relative"
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 text-muted-foreground"
          onClick={dismissPreviewPrompt}
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>

        <h2 className="font-display text-xl font-bold mb-2">Preview Ended</h2>
        <p className="text-sm text-muted-foreground mb-2">
          You've heard a 40-second preview of
        </p>
        <p className="font-medium text-foreground mb-1">
          "{currentTrack.title}"
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          by {currentTrack.release.artist.name}
        </p>

        <p className="text-sm text-muted-foreground mb-6">
          Donate to unlock the full <strong>{currentTrack.release.title}</strong> album — 
          stream every track and download it all.
        </p>

        <Button
          variant="hero"
          size="lg"
          className="w-full gap-2 mb-3"
          onClick={handleDonate}
        >
          <Heart className="w-4 h-4" />
          Donate & Unlock Album
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={dismissPreviewPrompt}
        >
          Maybe later
        </Button>
      </motion.div>
    </motion.div>
  );
}
