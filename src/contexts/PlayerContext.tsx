import { createContext, useContext, useState, useRef, useCallback, ReactNode, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Track {
  id: string;
  title: string;
  track_number: number;
  audio_path: string;
  duration_seconds: number | null;
  release: {
    id: string;
    title: string;
    cover_art_url: string | null;
    artist: {
      name: string;
    };
  };
}

interface PlayerContextType {
  currentTrack: Track | null;
  queue: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isExpanded: boolean;
  isFullListenMode: boolean;
  play: (track: Track, queue?: Track[]) => void;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleExpanded: () => void;
  addToQueue: (track: Track) => void;
  setFullListenMode: (enabled: boolean) => void;
  onTrackComplete: (callback: (trackId: string) => void) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Get user's country code from timezone or IP
async function getUserCountryCode(): Promise<string | null> {
  try {
    // Try to get country from timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneToCountry: Record<string, string> = {
      "America/New_York": "USA",
      "America/Los_Angeles": "USA",
      "America/Chicago": "USA",
      "America/Denver": "USA",
      "America/Phoenix": "USA",
      "America/Toronto": "CAN",
      "America/Vancouver": "CAN",
      "Europe/London": "GBR",
      "Europe/Paris": "FRA",
      "Europe/Berlin": "DEU",
      "Europe/Madrid": "ESP",
      "Europe/Rome": "ITA",
      "Europe/Amsterdam": "NLD",
      "Europe/Stockholm": "SWE",
      "Europe/Oslo": "NOR",
      "Europe/Copenhagen": "DNK",
      "Europe/Helsinki": "FIN",
      "Europe/Warsaw": "POL",
      "Europe/Moscow": "RUS",
      "Asia/Tokyo": "JPN",
      "Asia/Shanghai": "CHN",
      "Asia/Hong_Kong": "CHN",
      "Asia/Seoul": "KOR",
      "Asia/Singapore": "SGP",
      "Asia/Bangkok": "THA",
      "Asia/Jakarta": "IDN",
      "Asia/Manila": "PHL",
      "Asia/Kolkata": "IND",
      "Asia/Dubai": "ARE",
      "Australia/Sydney": "AUS",
      "Australia/Melbourne": "AUS",
      "Australia/Perth": "AUS",
      "Pacific/Auckland": "NZL",
      "America/Sao_Paulo": "BRA",
      "America/Mexico_City": "MEX",
      "America/Argentina/Buenos_Aires": "ARG",
      "America/Bogota": "COL",
      "America/Santiago": "CHL",
      "America/Lima": "PER",
      "Africa/Johannesburg": "ZAF",
      "Africa/Lagos": "NGA",
      "Africa/Cairo": "EGY",
      "Europe/Istanbul": "TUR",
      "Asia/Riyadh": "SAU",
      "Asia/Jerusalem": "ISR",
      "Asia/Ho_Chi_Minh": "VNM",
      "Asia/Kuala_Lumpur": "MYS",
      "Europe/Dublin": "IRL",
      "Europe/Lisbon": "PRT",
      "Europe/Brussels": "BEL",
      "Europe/Vienna": "AUT",
      "Europe/Zurich": "CHE",
      "Europe/Prague": "CZE",
      "Europe/Athens": "GRC",
      "Europe/Budapest": "HUN",
      "Europe/Bucharest": "ROU",
      "Europe/Kiev": "UKR",
    };

    return timezoneToCountry[timezone] || null;
  } catch {
    return null;
  }
}

// Log play event with location
async function logPlayEvent(track: Track, userId: string | null) {
  const countryCode = await getUserCountryCode();
  
  await supabase.from("events").insert({
    event_type: "play_start",
    track_id: track.id,
    release_id: track.release.id,
    user_id: userId,
    metadata: {
      country_code: countryCode,
      user_id: userId,
      track_title: track.title,
      release_title: track.release.title,
      artist_name: track.release.artist.name,
    },
  });
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullListenMode, setIsFullListenModeState] = useState(false);
  const trackCompleteCallbackRef = useRef<((trackId: string) => void) | null>(null);
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      // Notify that track completed naturally (for full listen mode)
      if (currentTrack && trackCompleteCallbackRef.current) {
        trackCompleteCallbackRef.current(currentTrack.id);
      }

      // Auto-play next track
      const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
      if (currentIndex < queue.length - 1) {
        play(queue[currentIndex + 1], queue);
      } else {
        setIsPlaying(false);
        setIsFullListenModeState(false);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [currentTrack, queue]);

  const play = useCallback(async (track: Track, newQueue?: Track[]) => {
    if (!audioRef.current) return;

    setCurrentTrack(track);
    if (newQueue) setQueue(newQueue);

    // Log play event with location
    const { data: { user } } = await supabase.auth.getUser();
    logPlayEvent(track, user?.id || null);

    // For now, use a placeholder - in production this would be a signed URL
    // We'll create an edge function for this
    const audioUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/audio/${track.audio_path}`;
    
    audioRef.current.src = audioUrl;
    try {
      await audioRef.current.play();
    } catch (err) {
      console.error("Error playing audio:", err);
    }
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    try {
      await audioRef.current?.play();
    } catch (err) {
      console.error("Error resuming:", err);
    }
  }, []);

  const next = useCallback(() => {
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex < queue.length - 1) {
      play(queue[currentIndex + 1], queue);
    }
  }, [currentTrack, queue, play]);

  const previous = useCallback(() => {
    const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
    if (currentIndex > 0) {
      play(queue[currentIndex - 1], queue);
    }
  }, [currentTrack, queue, play]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) setIsMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  }, [isMuted]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, track]);
  }, []);

  const setFullListenMode = useCallback((enabled: boolean) => {
    setIsFullListenModeState(enabled);
  }, []);

  const onTrackComplete = useCallback((callback: (trackId: string) => void) => {
    trackCompleteCallbackRef.current = callback;
  }, []);
  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        queue,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        isExpanded,
        isFullListenMode,
        play,
        pause,
        resume,
        next,
        previous,
        seek,
        setVolume,
        toggleMute,
        toggleExpanded,
        addToQueue,
        setFullListenMode,
        onTrackComplete,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error("usePlayer must be used within a PlayerProvider");
  }
  return context;
}
