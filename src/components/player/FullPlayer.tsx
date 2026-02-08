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
      className="fixed inset-0 z-50 bg-background overflow-hidden"
    >
      {/* Dynamic gradient background based on playing state */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/30 via-background/95 to-background" />
      
      {/* Circular pulse effect behind album art */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AudioVisualizer variant="pulse" className="w-[600px] h-[600px]" />
      </div>
      
      {/* Animated background visualizer - more prominent */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-2/3 opacity-25">
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
          {/* Album art with visualizer overlay */}
          <motion.div
            className="relative w-64 h-64 sm:w-80 sm:h-80 lg:w-96 lg:h-96"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Circular visualizer ring around album art */}
            <div className="absolute -inset-6 sm:-inset-8">
              <AudioVisualizer variant="circular" className="w-full h-full" />
            </div>
            
            <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl shadow-primary/30">
              {currentTrack.release.cover_art_url ? (
                <img
                  src={currentTrack.release.cover_art_url}
                  alt={currentTrack.release.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Disc3 className="w-24 h-24 text-muted-foreground animate-spin-slow" />
                </div>
              )}
            </div>
            
            {/* Prominent visualizer bar below album art */}
            <div className="absolute -bottom-8 left-0 right-0 h-14 px-4">
              <AudioVisualizer barCount={48} variant="wave" className="h-full" />
            </div>
          </motion.div>

          {/* Track info */}
          <div className="text-center max-w-md mt-4">
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

          {/* Progress bar - Spotify style */}
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

          {/* Controls - Spotify style layout */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
              <Shuffle className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={previous} className="w-12 h-12">
              <SkipBack className="w-6 h-6" fill="currentColor" />
            </Button>

            <Button
              variant="hero"
              onClick={isPlaying ? pause : resume}
              className="w-16 h-16 rounded-full"
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
