import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/admin/FileUpload";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Music, Loader2, Search, Clock, Mic, Radio, Sparkles, Zap, Focus, Heart, Sun } from "lucide-react";

const MOOD_OPTIONS = [
  { value: "", label: "No mood", icon: null },
  { value: "chill", label: "Chill", icon: <Sparkles className="w-4 h-4" /> },
  { value: "energetic", label: "Energetic", icon: <Zap className="w-4 h-4" /> },
  { value: "focus", label: "Focus", icon: <Focus className="w-4 h-4" /> },
  { value: "melancholic", label: "Melancholic", icon: <Heart className="w-4 h-4" /> },
  { value: "uplifting", label: "Uplifting", icon: <Sun className="w-4 h-4" /> },
];

interface Track {
  id: string;
  title: string;
  track_number: number;
  audio_path: string;
  duration_seconds: number | null;
  mood: string | null;
  created_at: string;
  release: { id: string; title: string } | null;
  commentary: { 
    id: string; 
    commentary_text: string;
    commentary_audio_path: string | null;
  } | null;
}

interface TrackForm {
  title: string;
  release_id: string;
  track_number: number;
  audio_path: string;
  duration_seconds: number;
  mood: string;
  commentary_text: string;
  commentary_audio_path: string;
}

const initialForm: TrackForm = {
  title: "",
  release_id: "",
  track_number: 1,
  audio_path: "",
  duration_seconds: 0,
  mood: "",
  commentary_text: "",
  commentary_audio_path: "",
};

export default function AdminTracks() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TrackForm>(initialForm);

  // Fetch tracks
  const { data: tracks, isLoading } = useQuery({
    queryKey: ["admin-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          title,
          track_number,
          audio_path,
          duration_seconds,
          mood,
          created_at,
          release:releases(id, title),
          commentary:track_commentary(id, commentary_text, commentary_audio_path)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Track[];
    },
  });

  // Fetch releases for dropdown
  const { data: releases } = useQuery({
    queryKey: ["releases-dropdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select("id, title")
        .order("title");

      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: TrackForm) => {
      if (editingId) {
        // Update track
        const { error: trackError } = await supabase
          .from("tracks")
          .update({
            title: data.title,
            release_id: data.release_id,
            track_number: data.track_number,
            audio_path: data.audio_path,
            duration_seconds: data.duration_seconds || null,
            mood: data.mood === "none" ? null : (data.mood || null),
          })
          .eq("id", editingId);
        if (trackError) throw trackError;

        // Update or create commentary
        if (data.commentary_text || data.commentary_audio_path) {
          const { data: existingCommentary } = await supabase
            .from("track_commentary")
            .select("id")
            .eq("track_id", editingId)
            .maybeSingle();

          if (existingCommentary) {
            const { error } = await supabase
              .from("track_commentary")
              .update({ 
                commentary_text: data.commentary_text,
                commentary_audio_path: data.commentary_audio_path || null,
              })
              .eq("id", existingCommentary.id);
            if (error) throw error;
          } else {
            const { error } = await supabase.from("track_commentary").insert({
              track_id: editingId,
              commentary_text: data.commentary_text || "",
              commentary_audio_path: data.commentary_audio_path || null,
            });
            if (error) throw error;
          }
        }
      } else {
        // Create track
        const { data: newTrack, error: trackError } = await supabase
          .from("tracks")
          .insert({
            title: data.title,
            release_id: data.release_id,
            track_number: data.track_number,
            audio_path: data.audio_path,
            duration_seconds: data.duration_seconds || null,
            mood: data.mood === "none" ? null : (data.mood || null),
          })
          .select()
          .single();
        if (trackError) throw trackError;

        // Create commentary if provided
        if ((data.commentary_text || data.commentary_audio_path) && newTrack) {
          const { error } = await supabase.from("track_commentary").insert({
            track_id: newTrack.id,
            commentary_text: data.commentary_text || "",
            commentary_audio_path: data.commentary_audio_path || null,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      toast.success(editingId ? "Track updated" : "Track created");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete commentary first (if exists)
      await supabase.from("track_commentary").delete().eq("track_id", id);
      // Delete track
      const { error } = await supabase.from("tracks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
      toast.success("Track deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (track: Track) => {
    setEditingId(track.id);
    setForm({
      title: track.title,
      release_id: track.release?.id || "",
      track_number: track.track_number,
      audio_path: track.audio_path,
      duration_seconds: track.duration_seconds || 0,
      mood: track.mood || "",
      commentary_text: track.commentary?.commentary_text || "",
      commentary_audio_path: track.commentary?.commentary_audio_path || "",
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.release_id || !form.audio_path) {
      toast.error("Title, release, and audio path are required");
      return;
    }
    saveMutation.mutate(form);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const filteredTracks = tracks?.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.release?.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Tracks</h1>
            <p className="mt-1 text-muted-foreground">
              Manage individual tracks and commentary
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm(initialForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Track
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Track" : "Add Track"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Track title"
                  />
                </div>

                <div>
                  <Label htmlFor="release">Release</Label>
                  <Select
                    value={form.release_id}
                    onValueChange={(value) => setForm({ ...form, release_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select release" />
                    </SelectTrigger>
                    <SelectContent>
                      {releases?.map((release) => (
                        <SelectItem key={release.id} value={release.id}>
                          {release.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="track_number">Track Number</Label>
                    <Input
                      id="track_number"
                      type="number"
                      min="1"
                      value={form.track_number}
                      onChange={(e) =>
                        setForm({ ...form, track_number: parseInt(e.target.value) || 1 })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="0"
                      value={form.duration_seconds}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          duration_seconds: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    Radio Station Mood
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Assign a mood to make this track appear in filtered radio stations.
                  </p>
                  <Select
                    value={form.mood}
                    onValueChange={(value) => setForm({ ...form, mood: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select mood (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOOD_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value || "none"}>
                          <div className="flex items-center gap-2">
                            {option.icon}
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Audio File</Label>
                  <FileUpload
                    bucket="audio"
                    currentUrl={form.audio_path}
                    onUpload={(path) => setForm({ ...form, audio_path: path })}
                    onRemove={() => setForm({ ...form, audio_path: "" })}
                    maxSizeMB={50}
                  />
                </div>

                <div>
                  <Label htmlFor="commentary">Behind the Frequency Commentary</Label>
                  <Textarea
                    id="commentary"
                    value={form.commentary_text}
                    onChange={(e) =>
                      setForm({ ...form, commentary_text: e.target.value })
                    }
                    placeholder="Share the story behind this track..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    Audio Commentary
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Upload an audio file where you discuss the track's creation, inspiration, or behind-the-scenes stories.
                  </p>
                  <FileUpload
                    bucket="audio"
                    currentUrl={form.commentary_audio_path}
                    onUpload={(path) => setForm({ ...form, commentary_audio_path: path })}
                    onRemove={() => setForm({ ...form, commentary_audio_path: "" })}
                    maxSizeMB={50}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : editingId ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tracks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead>Mood</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Commentary</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTracks?.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell className="text-muted-foreground">
                      {track.track_number}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Music className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{track.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>{track.release?.title || "—"}</TableCell>
                    <TableCell>
                      {track.mood ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary capitalize">
                          {MOOD_OPTIONS.find(m => m.value === track.mood)?.icon}
                          {track.mood}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(track.duration_seconds)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {track.commentary ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/20 text-primary">
                            Text
                          </span>
                          {track.commentary.commentary_audio_path && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-accent/20 text-accent-foreground">
                              <Mic className="w-3 h-3" />
                              Audio
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(track)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this track?")) {
                              deleteMutation.mutate(track.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredTracks?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tracks found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}
