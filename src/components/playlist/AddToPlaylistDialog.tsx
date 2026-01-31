import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePlaylists } from "@/hooks/usePlaylists";
import { Plus, Music, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AddToPlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle: string;
}

export function AddToPlaylistDialog({
  open,
  onOpenChange,
  trackId,
  trackTitle,
}: AddToPlaylistDialogProps) {
  const { user } = useAuth();
  const { playlists, isLoading, createPlaylist, addTrackToPlaylist } = usePlaylists();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [addedToPlaylists, setAddedToPlaylists] = useState<string[]>([]);

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in required</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Please sign in to add tracks to playlists.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    await createPlaylist.mutateAsync({
      name: newPlaylistName.trim(),
    });

    setNewPlaylistName("");
    setIsCreating(false);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    await addTrackToPlaylist.mutateAsync({ playlistId, trackId });
    setAddedToPlaylists((prev) => [...prev, playlistId]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to playlist</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {trackTitle}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {isCreating ? (
            <div className="flex gap-2">
              <Input
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
                autoFocus
              />
              <Button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim() || createPlaylist.isPending}
              >
                Create
              </Button>
              <Button variant="ghost" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setIsCreating(true)}
            >
              <Plus className="h-4 w-4" />
              Create new playlist
            </Button>
          )}

          <ScrollArea className="h-[300px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading playlists...
              </div>
            ) : playlists && playlists.length > 0 ? (
              <div className="space-y-1">
                {playlists.map((playlist) => {
                  const isAdded = addedToPlaylists.includes(playlist.id);
                  return (
                    <button
                      key={playlist.id}
                      onClick={() => !isAdded && handleAddToPlaylist(playlist.id)}
                      disabled={isAdded || addTrackToPlaylist.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        {isAdded ? (
                          <Check className="h-4 w-4 text-primary" />
                        ) : (
                          <Music className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{playlist.name}</p>
                        {playlist.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {playlist.description}
                          </p>
                        )}
                      </div>
                      {isAdded && (
                        <span className="text-xs text-primary">Added</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No playlists yet</p>
                <p className="text-sm">Create one to get started</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
