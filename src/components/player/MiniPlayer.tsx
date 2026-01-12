import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ChevronUp,
  Disc3,
} from "lucide-react";

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    pause,
    resume,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleExpanded,
  } = usePlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      exit={{ y: 100 }}
      className="player-bar"
    >
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-muted">
        <motion.div
          className="h-full bg-gradient-primary"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="container flex items-center h-20 gap-4">
        {/* Track info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={toggleExpanded}
            className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 group"
          >
            {currentTrack.release.cover_art_url ? (
              <img
                src={currentTrack.release.cover_art_url}
                alt={currentTrack.release.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Disc3 className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ChevronUp className="w-5 h-5" />
            </div>
          </button>

          <div className="min-w-0">
            <h4 className="font-medium text-sm truncate">{currentTrack.title}</h4>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack.release.artist.name} • {currentTrack.release.title}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={previous}
            className="hidden sm:flex"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant="hero"
            size="icon"
            onClick={isPlaying ? pause : resume}
            className="w-12 h-12"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            className="hidden sm:flex"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Time & Volume */}
        <div className="hidden md:flex items-center gap-4 flex-1 justify-end">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-2 w-32">
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={([val]) => setVolume(val / 100)}
              className="w-20"
            />
          </div>
        </div>

        {/* Expand button on mobile */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleExpanded}
          className="md:hidden"
        >
          <ChevronUp className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
