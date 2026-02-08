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

type RepeatMode = 'off' | 'all' | 'one';

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
  repeatMode: RepeatMode;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
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
  setRepeatMode: (mode: RepeatMode) => void;
  toggleRepeat: () => void;
  onTrackComplete: (callback: (trackId: string) => void) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

// Get user's country code from timezone
async function getUserCountryCode(): Promise<string | null> {
  try {
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

// Update Media Session API for lock screen controls
function updateMediaSession(track: Track, isPlaying: boolean, handlers: {
  play: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
}) {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.release.artist.name,
      album: track.release.title,
      artwork: track.release.cover_art_url ? [
        { src: track.release.cover_art_url, sizes: '512x512', type: 'image/jpeg' }
      ] : []
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', handlers.play);
    navigator.mediaSession.setActionHandler('pause', handlers.pause);
    navigator.mediaSession.setActionHandler('previoustrack', handlers.previous);
    navigator.mediaSession.setActionHandler('nexttrack', handlers.next);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) {
        handlers.seek(details.seekTime);
      }
    });
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullListenMode, setIsFullListenModeState] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>('off');
  const trackCompleteCallbackRef = useRef<((trackId: string) => void) | null>(null);

  // Initialize audio element and Web Audio API for visualizations
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.volume = volume;
      audioRef.current.crossOrigin = "anonymous";
    }

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Update media session position
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration || 0,
            playbackRate: audio.playbackRate,
            position: audio.currentTime
          });
        } catch (e) {
          // Ignore errors from position state
        }
      }
    };
    const handleDurationChange = async () => {
      const audioDuration = audio.duration || 0;
      setDuration(audioDuration);
      
      // Save duration to database if track doesn't have it and duration is valid
      if (currentTrack && !currentTrack.duration_seconds && audioDuration > 0) {
        const durationSeconds = Math.round(audioDuration);
        try {
          await supabase
            .from("tracks")
            .update({ duration_seconds: durationSeconds })
            .eq("id", currentTrack.id);
          console.log(`Saved duration ${durationSeconds}s for track ${currentTrack.id}`);
        } catch (err) {
          console.error("Error saving track duration:", err);
        }
      }
    };
    const handleEnded = () => {
      if (currentTrack && trackCompleteCallbackRef.current) {
        trackCompleteCallbackRef.current(currentTrack.id);
      }

      // Handle repeat modes
      if (repeatMode === 'one') {
        // Repeat the same track
        audio.currentTime = 0;
        audio.play();
        return;
      }

      const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
      if (currentIndex < queue.length - 1) {
        play(queue[currentIndex + 1], queue);
      } else if (repeatMode === 'all' && queue.length > 0) {
        // Loop back to the first track
        play(queue[0], queue);
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

  // Setup Web Audio API for visualizations
  const setupAudioContext = useCallback(async () => {
    if (!audioRef.current || audioContextRef.current) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume audio context if suspended (required for iOS)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContext.destination);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (err) {
      console.error("Error setting up audio context:", err);
    }
  }, []);

  const play = useCallback(async (track: Track, newQueue?: Track[]) => {
    if (!audioRef.current) return;

    setCurrentTrack(track);
    if (newQueue) setQueue(newQueue);

    // Log play event
    const { data: { user } } = await supabase.auth.getUser();
    logPlayEvent(track, user?.id || null);

    // Get signed URL for private audio bucket
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("audio")
      .createSignedUrl(track.audio_path, 3600); // 1 hour expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("Error getting signed URL:", signedUrlError);
      return;
    }
    
    audioRef.current.src = signedUrlData.signedUrl;
    
    // Setup audio context on first play (needs user interaction)
    await setupAudioContext();
    
    // Resume audio context if suspended (iOS fix)
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    
    try {
      await audioRef.current.play();
    } catch (err) {
      console.error("Error playing audio:", err);
    }
  }, [setupAudioContext]);

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

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setRepeatModeState(mode);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatModeState(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const onTrackComplete = useCallback((callback: (trackId: string) => void) => {
    trackCompleteCallbackRef.current = callback;
  }, []);

  // Update media session when track or play state changes
  useEffect(() => {
    if (currentTrack) {
      updateMediaSession(currentTrack, isPlaying, {
        play: resume,
        pause,
        next,
        previous,
        seek
      });
    }
  }, [currentTrack, isPlaying, resume, pause, next, previous, seek]);

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
        repeatMode,
        audioContext: audioContextRef.current,
        analyser: analyserRef.current,
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
        setRepeatMode,
        toggleRepeat,
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
