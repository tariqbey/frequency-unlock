import { motion } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFavorites } from "@/hooks/useFavorites";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AudioVisualizer } from "./AudioVisualizer";
import { cn } from "@/lib/utils";
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
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
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
    repeatMode,
    pause,
    resume,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleExpanded,
    toggleRepeat,
    play,
  } = usePlayer();

  const { isTrackFavorited, toggleTrackFavorite } = useFavorites();

  if (!currentTrack || !isExpanded) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-hidden"
      style={{
        background: "linear-gradient(180deg, hsl(270 40% 12%) 0%, hsl(260 30% 6%) 60%, hsl(260 25% 4%) 100%)",
      }}
    >
      {/* Subtle purple glow behind album art */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[500px] h-[500px] rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, hsl(270 85% 60% / 0.6), transparent 70%)" }}
        />
      </div>

      {/* Animated background visualizer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-2/3 opacity-15">
          <AudioVisualizer barCount={100} variant="bars" className="h-full" />
        </div>
      </div>

      <div className="relative h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6">
          <Button variant="ghost" size="icon" onClick={toggleExpanded}>
            <ChevronDown className="w-6 h-6" />
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Now Playing</p>
            <p className="text-sm font-medium mt-1">{currentTrack.release.title}</p>
          </div>
          <Button variant="ghost" size="icon">
            <ListMusic className="w-5 h-5" />
          </Button>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-8 gap-6 sm:gap-8">
          {/* Circular album art with purple ring */}
          <motion.div
            className="relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Outer glow ring */}
            <div
              className="absolute -inset-4 rounded-full opacity-50"
              style={{
                background: "conic-gradient(from 0deg, hsl(270 85% 60% / 0.4), hsl(290 85% 60% / 0.2), hsl(260 85% 60% / 0.4), hsl(280 85% 60% / 0.2), hsl(270 85% 60% / 0.4))",
                filter: "blur(12px)",
              }}
            />
            
            {/* Album art - circular */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full overflow-hidden border-2 border-primary/30 shadow-2xl shadow-primary/20">
              {currentTrack.release.cover_art_url ? (
                <img
                  src={currentTrack.release.cover_art_url}
                  alt={currentTrack.release.title}
                  className={cn(
                    "w-full h-full object-cover",
                    isPlaying && "animate-[spin_20s_linear_infinite]"
                  )}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Disc3 className={cn(
                    "w-24 h-24 text-muted-foreground",
                    isPlaying && "animate-[spin_3s_linear_infinite]"
                  )} />
                </div>
              )}
              {/* Center hole for vinyl effect */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 rounded-full bg-background/80 border border-primary/20" />
              </div>
            </div>
          </motion.div>

          {/* Track info */}
          <div className="text-center max-w-md mt-2">
            <div className="flex items-center justify-center gap-3">
              <h2 className="font-display text-xl sm:text-2xl font-bold truncate">
                {currentTrack.title}
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex-shrink-0"
                onClick={() => toggleTrackFavorite(currentTrack.id)}
              >
                <Heart 
                  className={cn(
                    "w-5 h-5",
                    isTrackFavorited(currentTrack.id) && "fill-primary text-primary"
                  )} 
                />
              </Button>
            </div>
            <p className="text-muted-foreground mt-1">
              {currentTrack.release.artist.name}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-md space-y-2">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={([val]) => seek((val / 100) * duration)}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Shuffle className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={previous} className="w-12 h-12">
              <SkipBack className="w-6 h-6" fill="currentColor" />
            </Button>

            <Button
              onClick={isPlaying ? pause : resume}
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/40"
            >
              {isPlaying ? (
                <Pause className="w-8 h-8" fill="currentColor" />
              ) : (
                <Play className="w-8 h-8 ml-1" fill="currentColor" />
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={next} className="w-12 h-12">
              <SkipForward className="w-6 h-6" fill="currentColor" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleRepeat}
              className={repeatMode !== 'off' ? "text-primary" : "text-muted-foreground hover:text-foreground"}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-5 h-5" />
              ) : (
                <Repeat className="w-5 h-5" />
              )}
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
          <div className="p-4 sm:p-6 border-t border-border/50 bg-background/80 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Up Next</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {queue
                .filter((t) => t.id !== currentTrack.id)
                .slice(0, 5)
                .map((track) => (
                  <button
                    key={track.id}
                    onClick={() => play(track, queue)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors flex-shrink-0 group"
                  >
                    {track.release.cover_art_url ? (
                      <img 
                        src={track.release.cover_art_url} 
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
                        <Disc3 className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="text-left">
                      <span className="text-sm font-medium truncate max-w-32 block group-hover:text-primary transition-colors">
                        {track.title}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {track.release.artist.name}
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
