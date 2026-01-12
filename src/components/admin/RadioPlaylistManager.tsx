import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Edit2,
  Music,
  Radio,
  Sparkles,
  Zap,
  Focus,
  Heart,
  Sun,
  Loader2,
  ListMusic,
  GripVertical,
  X,
  Search,
  Check,
} from "lucide-react";
import { format } from "date-fns";

const MOOD_OPTIONS = [
  { value: "all", label: "All Stations", icon: <Radio className="w-4 h-4" /> },
  { value: "chill", label: "Chill", icon: <Sparkles className="w-4 h-4" />, color: "bg-blue-500" },
  { value: "energetic", label: "Energetic", icon: <Zap className="w-4 h-4" />, color: "bg-orange-500" },
  { value: "focus", label: "Focus", icon: <Focus className="w-4 h-4" />, color: "bg-purple-500" },
  { value: "melancholic", label: "Melancholic", icon: <Heart className="w-4 h-4" />, color: "bg-slate-500" },
  { value: "uplifting", label: "Uplifting", icon: <Sun className="w-4 h-4" />, color: "bg-green-500" },
];

interface Playlist {
  id: string;
  name: string;
  description: string | null;
  station_mood: string | null;
  is_active: boolean;
  created_at: string;
  track_count?: number;
}

interface PlaylistTrack {
  id: string;
  position: number;
  track: {
    id: string;
    title: string;
    release: {
      title: string;
      artist: { name: string };
    };
  };
}

interface AvailableTrack {
  id: string;
  title: string;
  release: {
    title: string;
    artist: { name: string };
  };
}

export function RadioPlaylistManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [trackSearch, setTrackSearch] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    station_mood: "all",
    is_active: true,
  });

  // Fetch playlists with track counts
  const { data: playlists, isLoading: isLoadingPlaylists } = useQuery({
    queryKey: ["radio-playlists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radio_playlists")
        .select(`
          id,
          name,
          description,
          station_mood,
          is_active,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get track counts for each playlist
      const playlistsWithCounts = await Promise.all(
        (data || []).map(async (playlist) => {
          const { count } = await supabase
            .from("radio_playlist_tracks")
            .select("*", { count: "exact", head: true })
            .eq("playlist_id", playlist.id);
          return { ...playlist, track_count: count || 0 };
        })
      );

      return playlistsWithCounts as Playlist[];
    },
  });

  // Fetch tracks for selected playlist
  const { data: playlistTracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ["playlist-tracks", selectedPlaylist?.id],
    queryFn: async () => {
      if (!selectedPlaylist) return [];
      const { data, error } = await supabase
        .from("radio_playlist_tracks")
        .select(`
          id,
          position,
          track:tracks(
            id,
            title,
            release:releases(
              title,
              artist:artists(name)
            )
          )
        `)
        .eq("playlist_id", selectedPlaylist.id)
        .order("position");

      if (error) throw error;
      return data as unknown as PlaylistTrack[];
    },
    enabled: !!selectedPlaylist,
  });

  // Fetch all tracks for adding
  const { data: availableTracks } = useQuery({
    queryKey: ["available-tracks-for-playlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          title,
          release:releases(
            title,
            artist:artists(name)
          )
        `)
        .order("title");

      if (error) throw error;
      return data as unknown as AvailableTrack[];
    },
    enabled: !!selectedPlaylist,
  });

  // Create/Update playlist mutation
  const savePlaylistMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      name: string;
      description: string | null;
      station_mood: string | null;
      is_active: boolean;
    }) => {
      if (data.id) {
        const { error } = await supabase
          .from("radio_playlists")
          .update({
            name: data.name,
            description: data.description,
            station_mood: data.station_mood,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("radio_playlists").insert({
          name: data.name,
          description: data.description,
          station_mood: data.station_mood,
          is_active: data.is_active,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radio-playlists"] });
      toast.success(editingPlaylist ? "Playlist updated" : "Playlist created");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete playlist mutation
  const deletePlaylistMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("radio_playlists")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radio-playlists"] });
      toast.success("Playlist deleted");
      if (selectedPlaylist) setSelectedPlaylist(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Add track to playlist mutation
  const addTrackMutation = useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      // Get max position
      const { data: existing } = await supabase
        .from("radio_playlist_tracks")
        .select("position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { error } = await supabase.from("radio_playlist_tracks").insert({
        playlist_id: playlistId,
        track_id: trackId,
        position: nextPosition,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-tracks", selectedPlaylist?.id] });
      queryClient.invalidateQueries({ queryKey: ["radio-playlists"] });
      toast.success("Track added to playlist");
    },
    onError: (error: any) => {
      if (error.message?.includes("duplicate")) {
        toast.error("Track already in playlist");
      } else {
        toast.error(error.message);
      }
    },
  });

  // Remove track from playlist mutation
  const removeTrackMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("radio_playlist_tracks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-tracks", selectedPlaylist?.id] });
      queryClient.invalidateQueries({ queryKey: ["radio-playlists"] });
      toast.success("Track removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Reorder tracks mutation
  const reorderTracksMutation = useMutation({
    mutationFn: async ({ trackId, newPosition }: { trackId: string; newPosition: number }) => {
      const { error } = await supabase
        .from("radio_playlist_tracks")
        .update({ position: newPosition })
        .eq("id", trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-tracks", selectedPlaylist?.id] });
    },
  });

  const handleOpenDialog = (playlist?: Playlist) => {
    if (playlist) {
      setEditingPlaylist(playlist);
      setFormData({
        name: playlist.name,
        description: playlist.description || "",
        station_mood: playlist.station_mood || "all",
        is_active: playlist.is_active,
      });
    } else {
      setEditingPlaylist(null);
      setFormData({
        name: "",
        description: "",
        station_mood: "all",
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPlaylist(null);
    setFormData({
      name: "",
      description: "",
      station_mood: "all",
      is_active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Please enter a playlist name");
      return;
    }

    savePlaylistMutation.mutate({
      id: editingPlaylist?.id,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      station_mood: formData.station_mood === "all" ? null : formData.station_mood,
      is_active: formData.is_active,
    });
  };

  const getMoodDisplay = (mood: string | null) => {
    const option = MOOD_OPTIONS.find((m) => m.value === (mood || "all"));
    return option || MOOD_OPTIONS[0];
  };

  // Filter available tracks
  const filteredAvailableTracks = availableTracks?.filter((track) => {
    const inPlaylist = playlistTracks?.some((pt) => pt.track.id === track.id);
    const matchesSearch =
      track.title.toLowerCase().includes(trackSearch.toLowerCase()) ||
      track.release?.title?.toLowerCase().includes(trackSearch.toLowerCase()) ||
      track.release?.artist?.name?.toLowerCase().includes(trackSearch.toLowerCase());
    return !inPlaylist && matchesSearch;
  });

  const moveTrack = (trackId: string, direction: "up" | "down") => {
    if (!playlistTracks) return;
    
    const currentIndex = playlistTracks.findIndex((t) => t.id === trackId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= playlistTracks.length) return;

    const currentTrack = playlistTracks[currentIndex];
    const swapTrack = playlistTracks[newIndex];

    // Swap positions
    reorderTracksMutation.mutate({ trackId: currentTrack.id, newPosition: swapTrack.position });
    reorderTracksMutation.mutate({ trackId: swapTrack.id, newPosition: currentTrack.position });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary" />
            Radio Playlists
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create curated playlists for your radio stations
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              New Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPlaylist ? "Edit Playlist" : "Create Playlist"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Morning Vibes"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What's this playlist about?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="station">Target Station</Label>
                <Select
                  value={formData.station_mood}
                  onValueChange={(value) =>
                    setFormData({ ...formData, station_mood: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOOD_OPTIONS.map((mood) => (
                      <SelectItem key={mood.value} value={mood.value}>
                        <div className="flex items-center gap-2">
                          {mood.icon}
                          <span>{mood.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savePlaylistMutation.isPending}>
                  {savePlaylistMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingPlaylist ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Playlists Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoadingPlaylists ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : playlists?.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <ListMusic className="w-12 h-12 mb-4 opacity-50" />
            <p>No playlists yet</p>
            <p className="text-sm">Create your first playlist to get started</p>
          </div>
        ) : (
          <AnimatePresence>
            {playlists?.map((playlist) => {
              const moodDisplay = getMoodDisplay(playlist.station_mood);
              return (
                <motion.div
                  key={playlist.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-lg ${
                    selectedPlaylist?.id === playlist.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/50"
                  } ${!playlist.is_active ? "opacity-60" : ""}`}
                  onClick={() => setSelectedPlaylist(playlist)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <ListMusic className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{playlist.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {playlist.track_count} tracks
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDialog(playlist);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePlaylistMutation.mutate(playlist.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  
                  {playlist.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {playlist.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      {moodDisplay.icon}
                      {moodDisplay.label}
                    </Badge>
                    {!playlist.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Playlist Editor Sheet */}
      <Sheet open={!!selectedPlaylist} onOpenChange={(open) => !open && setSelectedPlaylist(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ListMusic className="w-5 h-5" />
              {selectedPlaylist?.name}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Add Tracks Section */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Add Tracks</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tracks..."
                  value={trackSearch}
                  onChange={(e) => setTrackSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                {filteredAvailableTracks?.slice(0, 20).map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Music className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{track.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {track.release?.artist?.name}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        addTrackMutation.mutate({
                          playlistId: selectedPlaylist!.id,
                          trackId: track.id,
                        })
                      }
                      disabled={addTrackMutation.isPending}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {filteredAvailableTracks?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No tracks found
                  </p>
                )}
              </div>
            </div>

            {/* Playlist Tracks */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">
                Playlist Tracks ({playlistTracks?.length || 0})
              </h3>
              
              {isLoadingTracks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : playlistTracks?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tracks in this playlist</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {playlistTracks?.map((item, index) => (
                    <motion.div
                      key={item.id}
                      layout
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 group"
                    >
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveTrack(item.id, "up")}
                          disabled={index === 0}
                        >
                          <GripVertical className="w-3 h-3 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveTrack(item.id, "down")}
                          disabled={index === playlistTracks.length - 1}
                        >
                          <GripVertical className="w-3 h-3 -rotate-90" />
                        </Button>
                      </div>
                      
                      <span className="w-6 text-center text-sm text-muted-foreground">
                        {index + 1}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.track?.title}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.track?.release?.artist?.name} - {item.track?.release?.title}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeTrackMutation.mutate(item.id)}
                      >
                        <X className="w-4 h-4 text-destructive" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
