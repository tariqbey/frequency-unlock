import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { usePlaylists, usePlaylistTracks } from "@/hooks/usePlaylists";
import { usePlayer } from "@/contexts/PlayerContext";
import { useAuth } from "@/hooks/useAuth";
import {
  Music,
  Play,
  Pause,
  MoreHorizontal,
  Trash2,
  Pencil,
  ArrowLeft,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { updatePlaylist, deletePlaylist, removeTrackFromPlaylist } = usePlaylists();
  const { data: tracks, isLoading: tracksLoading } = usePlaylistTracks(id);
  const { currentTrack, isPlaying, play, pause, resume } = usePlayer();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: playlist, isLoading: playlistLoading } = useQuery({
    queryKey: ["playlist", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("id", id!)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const convertToPlayerTrack = (track: NonNullable<typeof tracks>[0]["track"]) => {
    if (!track) return null;
    return {
      id: track.id,
      title: track.title,
      track_number: 1,
      audio_path: track.audio_path,
      duration_seconds: track.duration_seconds,
      release: {
        id: track.release.id,
        title: track.release.title,
        cover_art_url: track.release.cover_art_url,
        artist: {
          name: track.release.artist.name,
        },
      },
    };
  };

  const handlePlayAll = () => {
    if (tracks && tracks.length > 0 && tracks[0].track) {
      const playerTrack = convertToPlayerTrack(tracks[0].track);
      if (playerTrack) {
        const allTracks = tracks
          .map((t) => convertToPlayerTrack(t.track))
          .filter((t): t is NonNullable<typeof t> => t !== null);
        play(playerTrack, allTracks);
      }
    }
  };

  const handlePlayTrack = (track: NonNullable<typeof tracks>[0]["track"]) => {
    const playerTrack = convertToPlayerTrack(track);
    if (playerTrack) {
      const allTracks = tracks
        ?.map((t) => convertToPlayerTrack(t.track))
        .filter((t): t is NonNullable<typeof t> => t !== null) || [];
      play(playerTrack, allTracks);
    }
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  const handleEditPlaylist = async () => {
    if (!id || !editName.trim()) return;

    await updatePlaylist.mutateAsync({
      id,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });

    setEditDialogOpen(false);
  };

  const handleDeletePlaylist = async () => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this playlist?")) {
      await deletePlaylist.mutateAsync(id);
      navigate("/playlists");
    }
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!id) return;
    await removeTrackFromPlaylist.mutateAsync({ playlistId: id, trackId });
  };

  const openEditDialog = () => {
    if (playlist) {
      setEditName(playlist.name);
      setEditDescription(playlist.description || "");
      setEditDialogOpen(true);
    }
  };

  if (playlistLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-4" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 text-center">
          <h1 className="text-2xl font-bold mb-2">Playlist not found</h1>
          <Button onClick={() => navigate("/playlists")}>
            Back to Playlists
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === playlist.user_id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-24">
        <Button
          variant="ghost"
          className="mb-6 gap-2"
          onClick={() => navigate("/playlists")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Playlists
        </Button>

        {/* Header */}
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-48 h-48 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
            {playlist.cover_image_url ? (
              <img
                src={playlist.cover_image_url}
                alt={playlist.name}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <Music className="h-16 w-16 text-primary/50" />
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
              Playlist
            </p>
            <h1 className="text-4xl font-display font-bold mb-2">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-muted-foreground mb-4">{playlist.description}</p>
            )}
            <p className="text-sm text-muted-foreground mb-4">
              {tracks?.length || 0} tracks
            </p>

            <div className="flex items-center gap-3">
              <Button
                size="lg"
                className="gap-2"
                onClick={handlePlayAll}
                disabled={!tracks || tracks.length === 0}
              >
                <Play className="h-5 w-5" />
                Play All
              </Button>

              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={openEditDialog}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Playlist
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={handleDeletePlaylist}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Playlist
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        {/* Track List */}
        {tracksLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : tracks && tracks.length > 0 ? (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-2 text-sm text-muted-foreground border-b border-border">
              <span className="w-8">#</span>
              <span>Title</span>
              <span>Album</span>
              <span className="w-16 text-right">
                <Clock className="h-4 w-4 ml-auto" />
              </span>
              <span className="w-8" />
            </div>

            {tracks.map((item, index) => {
              if (!item.track) return null;
              const track = item.track;
              const isCurrentTrack = currentTrack?.id === track.id;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`group grid grid-cols-[auto_1fr_1fr_auto_auto] gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors ${
                    isCurrentTrack ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="w-8 flex items-center">
                    <button
                      onClick={() =>
                        isCurrentTrack
                          ? togglePlayPause()
                          : handlePlayTrack(track)
                      }
                      className="group-hover:opacity-100 opacity-0 transition-opacity"
                    >
                      {isCurrentTrack && isPlaying ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <span className="group-hover:hidden text-muted-foreground">
                      {index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={track.release.cover_art_url || "/placeholder.svg"}
                      alt={track.release.title}
                      className="w-10 h-10 rounded object-cover"
                    />
                    <div className="min-w-0">
                      <p
                        className={`font-medium truncate ${
                          isCurrentTrack ? "text-primary" : ""
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {track.release.artist.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <p className="text-sm text-muted-foreground truncate">
                      {track.release.title}
                    </p>
                  </div>

                  <div className="w-16 flex items-center justify-end text-sm text-muted-foreground">
                    {formatDuration(track.duration_seconds)}
                  </div>

                  <div className="w-8 flex items-center">
                    {isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleRemoveTrack(track.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Remove from playlist
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No tracks yet</h2>
            <p className="text-muted-foreground">
              Add tracks from albums or the library to build your playlist
            </p>
          </div>
        )}
      </main>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Input
                placeholder="Playlist name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Description (optional)"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditPlaylist}
              disabled={!editName.trim() || updatePlaylist.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
