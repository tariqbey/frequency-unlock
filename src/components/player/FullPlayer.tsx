import { useState } from "react";
import { motion } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TrackCommentaryDialog } from "@/components/release/TrackCommentaryDialog";
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
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Quote,
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
  } = usePlayer();

  const { isTrackFavorited, toggleTrackFavorite } = useFavorites();
  const [commentaryOpen, setCommentaryOpen] = useState(false);

  // Fetch commentary for the current track
  const { data: commentary } = useQuery({
    queryKey: ["track-commentary", currentTrack?.id],
    queryFn: async () => {
      if (!currentTrack) return null;
      const { data, error } = await supabase
        .from("track_commentary")
        .select("id, commentary_text, commentary_audio_path, timestamp_notes_json")
        .eq("track_id", currentTrack.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentTrack?.id && isExpanded,
  });

  if (!currentTrack || !isExpanded) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(180deg, hsl(270 50% 15%) 0%, hsl(265 35% 8%) 50%, hsl(260 25% 4%) 100%)",
        }}
      >
        {/* Ambient purple glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-20 blur-[100px]"
            style={{ background: "hsl(270 85% 55%)" }}
          />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-14 pb-4 safe-area-top">
          <Button variant="ghost" size="icon" onClick={toggleExpanded} className="text-foreground/70 hover:text-foreground">
            <ChevronDown className="w-7 h-7" />
          </Button>
          <div className="text-center flex-1">
            <p className="text-xs text-muted-foreground uppercase tracking-[0.2em]">Now Playing</p>
            <p className="text-sm font-medium text-foreground/80 mt-0.5 truncate px-4">{currentTrack.release.title}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-foreground/70 hover:text-foreground"
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

        {/* Album art - centered circular */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
          <motion.div
            className="relative mb-8"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Outer glow ring */}
            <div
              className="absolute -inset-3 rounded-full"
              style={{
                background: "conic-gradient(from 180deg, hsl(270 80% 50% / 0.3), hsl(290 80% 55% / 0.15), hsl(260 80% 50% / 0.3), hsl(280 80% 55% / 0.15), hsl(270 80% 50% / 0.3))",
                filter: "blur(16px)",
              }}
            />

            {/* Album art circle */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 rounded-full overflow-hidden border border-primary/20 shadow-2xl shadow-primary/30">
              {currentTrack.release.cover_art_url ? (
                <img
                  src={currentTrack.release.cover_art_url}
                  alt={currentTrack.release.title}
                  className={cn(
                    "w-full h-full object-cover",
                    isPlaying && "animate-[spin_25s_linear_infinite]"
                  )}
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <Disc3 className={cn(
                    "w-20 h-20 text-muted-foreground",
                    isPlaying && "animate-[spin_3s_linear_infinite]"
                  )} />
                </div>
              )}
              {/* Vinyl center hole */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-6 h-6 rounded-full bg-background/90 border border-primary/10" />
              </div>
            </div>
          </motion.div>

          {/* Track info */}
          <div className="text-center w-full max-w-sm mb-6">
            <h2 className="font-display text-lg sm:text-xl font-bold truncate">
              {currentTrack.title}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {currentTrack.release.artist.name}
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-sm space-y-1.5 mb-6">
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={([val]) => seek((val / 100) * duration)}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-5 sm:gap-7 mb-6">
            <Button variant="ghost" size="icon" className="w-10 h-10 text-muted-foreground hover:text-foreground">
              <Shuffle className="w-4 h-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={previous} className="w-12 h-12 text-foreground">
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </Button>

            <button
              onClick={isPlaying ? pause : resume}
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/40 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="w-7 h-7" fill="currentColor" />
              ) : (
                <Play className="w-7 h-7 ml-0.5" fill="currentColor" />
              )}
            </button>

            <Button variant="ghost" size="icon" onClick={next} className="w-12 h-12 text-foreground">
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRepeat}
              className={cn("w-10 h-10", repeatMode !== 'off' ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              {repeatMode === 'one' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 w-full max-w-[200px] mb-4">
            <Button variant="ghost" size="icon" onClick={toggleMute} className="w-8 h-8 text-muted-foreground">
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
              className="flex-1"
            />
          </div>

          {/* Commentary button */}
          {commentary && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                variant="glass"
                size="sm"
                onClick={() => setCommentaryOpen(true)}
                className="gap-2"
              >
                <Quote className="w-4 h-4 text-primary" />
                <span className="text-sm">Behind the Frequency</span>
              </Button>
            </motion.div>
          )}
        </div>

        {/* Bottom safe area */}
        <div className="safe-area-bottom" />
      </motion.div>

      {/* Commentary Dialog */}
      {currentTrack && (
        <TrackCommentaryDialog
          open={commentaryOpen}
          onOpenChange={setCommentaryOpen}
          trackId={currentTrack.id}
          trackTitle={currentTrack.title}
          artistName={currentTrack.release.artist.name}
          releaseId={currentTrack.release.id}
          commentary={commentary ? {
            id: commentary.id,
            commentary_text: commentary.commentary_text,
            commentary_audio_path: commentary.commentary_audio_path,
            timestamp_notes_json: commentary.timestamp_notes_json as Record<string, string> | null,
          } : null}
        />
      )}
    </>
  );
}
