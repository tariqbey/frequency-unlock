import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Quote, Mic, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";

interface Commentary {
  id: string;
  commentary_text: string;
  commentary_audio_path: string | null;
  timestamp_notes_json: Record<string, string> | null;
}

interface CommentarySectionProps {
  trackTitle: string;
  artistName: string;
  commentary: Commentary | null;
  onClose: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CommentarySection({
  trackTitle,
  artistName,
  commentary,
  onClose,
}: CommentarySectionProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Get signed URL for commentary audio
  useEffect(() => {
    if (commentary?.commentary_audio_path) {
      const getSignedUrl = async () => {
        const { data } = await supabase.storage
          .from("audio")
          .createSignedUrl(commentary.commentary_audio_path!, 3600);
        if (data?.signedUrl) {
          setAudioUrl(data.signedUrl);
        }
      };
      getSignedUrl();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [commentary?.commentary_audio_path]);

  // Setup audio element
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = volume;

      audioRef.current.addEventListener("loadedmetadata", () => {
        setDuration(audioRef.current?.duration || 0);
      });

      audioRef.current.addEventListener("timeupdate", () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  if (!commentary) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="glass-card overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Quote className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gradient">
                Behind the Frequency
              </h3>
              <p className="text-xs text-muted-foreground">
                {artistName} on "{trackTitle}"
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Audio Player */}
          {audioUrl && (
            <div className="rounded-xl bg-muted/50 p-4 mb-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Audio Commentary</p>
                  <p className="text-xs text-muted-foreground">
                    Listen to {artistName} explain this track
                  </p>
                </div>
              </div>

              {/* Playback controls */}
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  )}
                </Button>

                <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
                  {formatTime(currentTime)}
                </span>

                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="flex-1"
                />

                <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
                  {formatTime(duration)}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>

                <Slider
                  value={[isMuted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>
            </div>
          )}

          {/* Text commentary */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
          >
            {commentary.commentary_text}
          </motion.p>

          {/* Timestamp notes */}
          {commentary.timestamp_notes_json && Object.keys(commentary.timestamp_notes_json).length > 0 && (
            <div className="mt-6 pt-6 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-3">Timestamp Notes</h4>
              <div className="space-y-2">
                {Object.entries(commentary.timestamp_notes_json).map(([time, note]) => (
                  <div key={time} className="flex gap-3 text-sm">
                    <span className="font-mono text-primary shrink-0">{time}</span>
                    <span className="text-muted-foreground">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
