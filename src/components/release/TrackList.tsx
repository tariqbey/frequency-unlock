import { useState } from "react";
import { motion } from "framer-motion";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, Pause, Download, MessageSquare, Heart, Share2, ListPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AddToPlaylistDialog } from "@/components/playlist/AddToPlaylistDialog";

interface Track {
  id: string;
  title: string;
  track_number: number;
  audio_path: string;
  duration_seconds: number | null;
  track_commentary?: {
    commentary_text: string;
  }[];
}

interface TrackListProps {
  tracks: Track[];
  release: {
    id: string;
    title: string;
    cover_art_url: string | null;
    artist: {
      name: string;
    };
  };
  hasUnlockedDownloads: boolean;
  onShowCommentary: (trackId: string) => void;
  activeCommentaryTrackId: string | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TrackList({
  tracks,
  release,
  hasUnlockedDownloads,
  onShowCommentary,
  activeCommentaryTrackId,
}: TrackListProps) {
  const { currentTrack, isPlaying, play, pause, resume } = usePlayer();
  const { isTrackFavorited, toggleTrackFavorite } = useFavorites();
  const { user } = useAuth();
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const openPlaylistDialog = (track: Track) => {
    setSelectedTrack(track);
    setPlaylistDialogOpen(true);
  };

  const handlePlayTrack = (track: Track) => {
    const playerTrack = {
      id: track.id,
      title: track.title,
      track_number: track.track_number,
      audio_path: track.audio_path,
      duration_seconds: track.duration_seconds,
      release: {
        id: release.id,
        title: release.title,
        cover_art_url: release.cover_art_url,
        artist: release.artist,
      },
    };

    const queue = tracks.map((t) => ({
      id: t.id,
      title: t.title,
      track_number: t.track_number,
      audio_path: t.audio_path,
      duration_seconds: t.duration_seconds,
      release: {
        id: release.id,
        title: release.title,
        cover_art_url: release.cover_art_url,
        artist: release.artist,
      },
    }));

    if (currentTrack?.id === track.id) {
      isPlaying ? pause() : resume();
    } else {
      play(playerTrack, queue);
    }
  };

  const handleShare = async (track: Track, platform: string) => {
    const shareUrl = `${window.location.origin}/release/${release.id}?track=${track.id}`;
    const shareText = `Check out "${track.title}" by ${release.artist.name} on 363 Music`;

    // Log share to database
    try {
      await supabase.from("shares").insert({
        track_id: track.id,
        release_id: release.id,
        platform,
        user_id: user?.id || null,
      });
    } catch (error) {
      console.error("Failed to log share:", error);
    }

    let shareLink = "";
    switch (platform) {
      case "twitter":
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case "facebook":
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
      case "whatsapp":
        shareLink = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
        break;
      case "copy":
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
        return;
      default:
        if (navigator.share) {
          try {
            await navigator.share({
              title: track.title,
              text: shareText,
              url: shareUrl,
            });
          } catch (err) {
            console.log("Share cancelled");
          }
        }
        return;
    }

    window.open(shareLink, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  return (
    <div className="space-y-1">
      {tracks.map((track, index) => {
        const isCurrentTrack = currentTrack?.id === track.id;
        const isTrackPlaying = isCurrentTrack && isPlaying;
        const hasCommentary = track.track_commentary && track.track_commentary.length > 0;

        return (
          <motion.div
            key={track.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "group flex items-center gap-4 p-3 rounded-lg transition-colors",
              isCurrentTrack
                ? "bg-primary/10 border border-primary/30"
                : "hover:bg-muted/50"
            )}
          >
            {/* Play button / Track number */}
            <button
              onClick={() => handlePlayTrack(track)}
              className="w-10 h-10 flex items-center justify-center relative"
            >
              <span
                className={cn(
                  "text-sm font-mono transition-opacity",
                  "group-hover:opacity-0",
                  isCurrentTrack ? "text-primary" : "text-muted-foreground"
                )}
              >
                {track.track_number.toString().padStart(2, "0")}
              </span>
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center transition-opacity",
                  "opacity-0 group-hover:opacity-100",
                  isTrackPlaying && "opacity-100"
                )}
              >
                {isTrackPlaying ? (
                  <Pause className="w-5 h-5 text-primary" />
                ) : (
                  <Play className="w-5 h-5 text-primary ml-0.5" />
                )}
              </div>
            </button>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <h4
                className={cn(
                  "font-medium text-sm truncate",
                  isCurrentTrack && "text-primary"
                )}
              >
                {track.title}
              </h4>
              {isTrackPlaying && (
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3].map((bar) => (
                    <motion.div
                      key={bar}
                      className="w-0.5 bg-primary rounded-full"
                      animate={{
                        height: [4, 12, 4],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: bar * 0.1,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Commentary button */}
            {hasCommentary && (
              <Button
                variant={activeCommentaryTrackId === track.id ? "default" : "ghost"}
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onShowCommentary(track.id)}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}

            {/* Favorite button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "opacity-0 group-hover:opacity-100 transition-opacity",
                isTrackFavorited(track.id) && "opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                toggleTrackFavorite(track.id);
              }}
            >
              <Heart
                className={cn(
                  "w-4 h-4",
                  isTrackFavorited(track.id) && "fill-primary text-primary"
                )}
              />
            </Button>

            {/* Share dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleShare(track, "twitter")}>
                  Share on X (Twitter)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare(track, "facebook")}>
                  Share on Facebook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare(track, "whatsapp")}>
                  Share on WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleShare(track, "copy")}>
                  Copy Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Add to Playlist button */}
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                openPlaylistDialog(track);
              }}
            >
              <ListPlus className="w-4 h-4" />
            </Button>

            {/* Download button */}
            {hasUnlockedDownloads && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download className="w-4 h-4" />
              </Button>
            )}

            {/* Duration */}
            <span className="text-sm text-muted-foreground font-mono w-12 text-right">
              {formatDuration(track.duration_seconds)}
            </span>
          </motion.div>
        );
      })}

      {/* Add to Playlist Dialog */}
      <AddToPlaylistDialog
        open={playlistDialogOpen}
        onOpenChange={setPlaylistDialogOpen}
        trackId={selectedTrack?.id || ""}
        trackTitle={selectedTrack?.title || ""}
      />
    </div>
  );
}