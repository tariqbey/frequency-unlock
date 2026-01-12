import { motion } from "framer-motion";
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
  ChevronDown,
  Disc3,
  ListMusic,
} from "lucide-react";

function formatTime(seconds: number): string {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function FullPlayer() {
  const {
    currentTrack,
    queue,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isExpanded,
    pause,
    resume,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleExpanded,
    play,
  } = usePlayer();

  if (!currentTrack || !isExpanded) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 hero-gradient opacity-50" />

      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={toggleExpanded}>
            <ChevronDown className="w-6 h-6" />
          </Button>
          <p className="text-sm text-muted-foreground">Now Playing</p>
          <Button variant="ghost" size="icon">
            <ListMusic className="w-5 h-5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 gap-8">
          {/* Album art */}
          <motion.div
            className="w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-2xl shadow-primary/20"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {currentTrack.release.cover_art_url ? (
              <img
                src={currentTrack.release.cover_art_url}
                alt={currentTrack.release.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Disc3 className="w-24 h-24 text-muted-foreground" />
              </div>
            )}
          </motion.div>

          {/* Track info */}
          <div className="text-center max-w-md">
            <h2 className="font-display text-2xl font-bold">{currentTrack.title}</h2>
            <p className="text-muted-foreground mt-1">
              {currentTrack.release.artist.name} • {currentTrack.release.title}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md space-y-2">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={([val]) => seek((val / 100) * duration)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" onClick={previous}>
              <SkipBack className="w-6 h-6" />
            </Button>

            <Button
              variant="hero"
              size="xl"
              onClick={isPlaying ? pause : resume}
              className="w-16 h-16 rounded-full"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-1" />
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={next}>
              <SkipForward className="w-6 h-6" />
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-3 w-full max-w-xs">
            <Button variant="ghost" size="icon" onClick={toggleMute}>
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={([val]) => setVolume(val / 100)}
              className="flex-1"
            />
          </div>
        </div>

        {/* Queue preview */}
        {queue.length > 1 && (
          <div className="p-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Up Next</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {queue
                .filter((t) => t.id !== currentTrack.id)
                .slice(0, 5)
                .map((track) => (
                  <button
                    key={track.id}
                    onClick={() => play(track, queue)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors flex-shrink-0"
                  >
                    <span className="text-sm truncate max-w-32">{track.title}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
