import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Music, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Playlists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playlists, isLoading, createPlaylist, deletePlaylist } = usePlaylists();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    const result = await createPlaylist.mutateAsync({
      name: newPlaylistName.trim(),
      description: newPlaylistDescription.trim() || undefined,
    });

    setNewPlaylistName("");
    setNewPlaylistDescription("");
    setCreateDialogOpen(false);

    if (result?.id) {
      navigate(`/playlist/${result.id}`);
    }
  };

  const handleDeletePlaylist = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this playlist?")) {
      await deletePlaylist.mutateAsync(id);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-24 text-center">
          <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Sign in to view playlists</h1>
          <p className="text-muted-foreground mb-6">
            Create and manage your personal playlists
          </p>
          <Button asChild>
            <Link to="/auth">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container py-24">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Your Playlists</h1>
            <p className="text-muted-foreground mt-1">
              Create and organize your music collections
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Playlist
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {playlists.map((playlist, index) => (
              <motion.div
                key={playlist.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/playlist/${playlist.id}`}
                  className="group block"
                >
                  <div className="relative aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                    {playlist.cover_image_url ? (
                      <img
                        src={playlist.cover_image_url}
                        alt={playlist.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music className="h-12 w-12 text-primary/50" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 hover:bg-black/70"
                          onClick={(e) => e.preventDefault()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/playlist/${playlist.id}`}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => handleDeletePlaylist(playlist.id, e as any)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2">
                    <h3 className="font-medium truncate">{playlist.name}</h3>
                    {playlist.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {playlist.description}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Music className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">No playlists yet</h2>
            <p className="text-muted-foreground mb-6">
              Create your first playlist to start organizing your music
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Playlist
            </Button>
          </div>
        )}
      </main>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Input
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreatePlaylist()}
              />
            </div>
            <div>
              <Input
                placeholder="Description (optional)"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePlaylist}
              disabled={!newPlaylistName.trim() || createPlaylist.isPending}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
