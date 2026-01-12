import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "@/contexts/PlayerContext";
import {
  Radio as RadioIcon,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Disc3,
  Music,
  Loader2,
  Shuffle,
  Sparkles,
  Zap,
  Focus,
  Heart,
  Sun,
} from "lucide-react";

interface Station {
  id: string;
  name: string;
  mood: string | null;
  icon: React.ReactNode;
  color: string;
  description: string;
}

const STATIONS: Station[] = [
  {
    id: "all",
    name: "All Music",
    mood: null,
    icon: <RadioIcon className="w-5 h-5" />,
    color: "from-primary to-primary/50",
    description: "Everything in the catalog",
  },
  {
    id: "chill",
    name: "Chill",
    mood: "chill",
    icon: <Sparkles className="w-5 h-5" />,
    color: "from-blue-500 to-cyan-400",
    description: "Relaxing vibes",
  },
  {
    id: "energetic",
    name: "Energetic",
    mood: "energetic",
    icon: <Zap className="w-5 h-5" />,
    color: "from-orange-500 to-yellow-400",
    description: "High energy beats",
  },
  {
    id: "focus",
    name: "Focus",
    mood: "focus",
    icon: <Focus className="w-5 h-5" />,
    color: "from-purple-500 to-indigo-400",
    description: "Deep concentration",
  },
  {
    id: "melancholic",
    name: "Melancholic",
    mood: "melancholic",
    icon: <Heart className="w-5 h-5" />,
    color: "from-slate-500 to-slate-400",
    description: "Emotional journeys",
  },
  {
    id: "uplifting",
    name: "Uplifting",
    mood: "uplifting",
    icon: <Sun className="w-5 h-5" />,
    color: "from-green-500 to-emerald-400",
    description: "Feel-good tunes",
  },
];

interface Track {
  id: string;
  title: string;
  track_number: number;
  audio_path: string;
  duration_seconds: number | null;
  mood: string | null;
  release: {
    id: string;
    title: string;
    cover_art_url: string | null;
    artist: {
      name: string;
    };
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function Radio() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    play,
    pause,
    resume,
    next,
    setVolume,
    toggleMute,
    queue,
  } = usePlayer();

  const [isRadioMode, setIsRadioMode] = useState(false);
  const [selectedStation, setSelectedStation] = useState<Station>(STATIONS[0]);
  const [visualizerBars, setVisualizerBars] = useState<number[]>(
    Array(20).fill(0)
  );

  // Fetch all published tracks (for getting counts)
  const { data: allTracks } = useQuery({
    queryKey: ["radio-all-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          mood,
          release:releases!inner(is_published)
        `)
        .eq("release.is_published", true);

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate track counts per mood
  const moodCounts = allTracks?.reduce((acc, track) => {
    const mood = track.mood || "all";
    acc[mood] = (acc[mood] || 0) + 1;
    acc["total"] = (acc["total"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Fetch tracks for selected station
  const { data: tracks, isLoading } = useQuery({
    queryKey: ["radio-tracks", selectedStation.mood],
    queryFn: async () => {
      let query = supabase
        .from("tracks")
        .select(`
          id,
          title,
          track_number,
          audio_path,
          duration_seconds,
          mood,
          release:releases!inner(
            id,
            title,
            cover_art_url,
            is_published,
            artist:artists(name)
          )
        `)
        .eq("release.is_published", true);

      // Filter by mood if a specific station is selected
      if (selectedStation.mood) {
        query = query.eq("mood", selectedStation.mood);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our Track interface
      return (data || []).map((track: any) => ({
        id: track.id,
        title: track.title,
        track_number: track.track_number,
        audio_path: track.audio_path,
        duration_seconds: track.duration_seconds,
        mood: track.mood,
        release: {
          id: track.release.id,
          title: track.release.title,
          cover_art_url: track.release.cover_art_url,
          artist: {
            name: track.release.artist.name,
          },
        },
      })) as Track[];
    },
  });

  // Helper to get count for a station
  const getStationCount = (station: Station) => {
    if (station.mood === null) {
      return moodCounts["total"] || 0;
    }
    return moodCounts[station.mood] || 0;
  };

  // Animate visualizer when playing
  useEffect(() => {
    if (!isPlaying || !isRadioMode) {
      setVisualizerBars(Array(20).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setVisualizerBars(
        Array(20)
          .fill(0)
          .map(() => Math.random() * 100)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isRadioMode]);

  const startRadio = (station?: Station) => {
    if (!tracks || tracks.length === 0) return;

    if (station) {
      setSelectedStation(station);
    }
    const shuffledTracks = shuffleArray(tracks);
    setIsRadioMode(true);
    play(shuffledTracks[0], shuffledTracks);
  };

  const handleStationChange = (station: Station) => {
    setSelectedStation(station);
    // If currently playing, restart with new station after tracks refetch
    if (isRadioMode) {
      pause();
      setIsRadioMode(false);
    }
  };

  const stopRadio = () => {
    setIsRadioMode(false);
    pause();
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (currentTrack) {
      resume();
    } else {
      startRadio();
    }
  };

  const skipTrack = () => {
    next();
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentIndex = currentTrack
    ? queue.findIndex((t) => t.id === currentTrack.id)
    : -1;
  const upNext = currentIndex >= 0 && currentIndex < queue.length - 1
    ? queue.slice(currentIndex + 1, currentIndex + 4)
    : [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container max-w-4xl pt-24 px-4 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <RadioIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Live Radio</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            Frequency Radio
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Continuous streaming of featured artists. Sit back, relax, and discover new music.
          </p>
        </motion.div>

        {/* Station Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-8"
        >
          <h2 className="font-display text-lg font-semibold mb-4 text-center">Choose a Station</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {STATIONS.map((station) => (
              <button
                key={station.id}
                onClick={() => handleStationChange(station)}
                className={`relative group p-4 rounded-xl transition-all duration-300 ${
                  selectedStation.id === station.id
                    ? "bg-gradient-to-br " + station.color + " text-white shadow-lg scale-105"
                    : "bg-muted/50 hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className={`relative p-2 rounded-full ${
                    selectedStation.id === station.id 
                      ? "bg-white/20" 
                      : "bg-background"
                  }`}>
                    {station.icon}
                    {/* Track count badge */}
                    <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                      selectedStation.id === station.id
                        ? "bg-white text-black"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      {getStationCount(station)}
                    </span>
                  </div>
                  <span className="font-medium text-sm">{station.name}</span>
                  <span className={`text-xs ${
                    selectedStation.id === station.id 
                      ? "text-white/80" 
                      : "text-muted-foreground"
                  }`}>
                    {station.description}
                  </span>
                </div>
                {selectedStation.id === station.id && (
                  <motion.div
                    layoutId="station-indicator"
                    className="absolute inset-0 rounded-xl border-2 border-white/50"
                  />
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Main Radio Player */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 mb-8"
        >
          {/* Album Art & Visualizer */}
          <div className="relative w-64 h-64 mx-auto mb-8">
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{
                duration: 8,
                repeat: isPlaying ? Infinity : 0,
                ease: "linear",
              }}
              className="relative w-full h-full"
            >
              {currentTrack?.release.cover_art_url ? (
                <img
                  src={currentTrack.release.cover_art_url}
                  alt={currentTrack.release.title}
                  className="w-full h-full object-cover rounded-full shadow-2xl shadow-primary/20"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-2xl">
                  <Disc3 className="w-24 h-24 text-primary/50" />
                </div>
              )}
              {/* Center hole */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-background border-4 border-muted" />
              </div>
            </motion.div>

            {/* Pulsing ring when playing */}
            <AnimatePresence>
              {isPlaying && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: [0.5, 0], scale: [1, 1.5] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full border-2 border-primary"
                />
              )}
            </AnimatePresence>
          </div>

          {/* Track Info */}
          <div className="text-center mb-8">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-muted-foreground">Loading tracks...</span>
              </div>
            ) : currentTrack ? (
              <>
                <h2 className="font-display text-2xl font-bold mb-2">
                  {currentTrack.title}
                </h2>
                <p className="text-muted-foreground">
                  {currentTrack.release.artist.name} • {currentTrack.release.title}
                </p>
                <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">
                Press play to start the radio
              </p>
            )}
          </div>

          {/* Audio Visualizer */}
          <div className="flex items-end justify-center gap-1 h-16 mb-8">
            {visualizerBars.map((height, index) => (
              <motion.div
                key={index}
                className="w-2 bg-gradient-to-t from-primary to-primary/50 rounded-full"
                animate={{ height: isPlaying ? `${Math.max(height, 10)}%` : "10%" }}
                transition={{ duration: 0.1 }}
              />
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={toggleMute}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>

            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24"
            />

            <Button
              variant="hero"
              size="icon"
              className="h-16 w-16 rounded-full"
              onClick={togglePlayPause}
              disabled={isLoading || !tracks?.length}
            >
              {isPlaying ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 ml-1" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={skipTrack}
              disabled={!currentTrack}
            >
              <SkipForward className="w-5 h-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={() => startRadio()}
              disabled={isLoading || !tracks?.length}
              title="Shuffle & Restart"
            >
              <Shuffle className="w-5 h-5" />
            </Button>
          </div>

          {/* Status */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              {isPlaying && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              {isPlaying ? "ON AIR" : "OFFLINE"}
              {" • "}
              <span className="font-medium text-foreground">{selectedStation.name}</span>
              {tracks && ` • ${tracks.length} tracks`}
            </span>
          </div>
        </motion.div>

        {/* Up Next */}
        {upNext.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Coming Up Next
            </h3>
            <div className="space-y-3">
              {upNext.map((track, index) => (
                <div
                  key={track.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                >
                  <span className="text-sm text-muted-foreground w-6">
                    {index + 1}
                  </span>
                  {track.release.cover_art_url ? (
                    <img
                      src={track.release.cover_art_url}
                      alt={track.release.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Disc3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {track.release.artist.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
