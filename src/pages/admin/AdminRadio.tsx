import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Radio,
  Music,
  Loader2,
  Search,
  Sparkles,
  Zap,
  Focus,
  Heart,
  Sun,
  Save,
} from "lucide-react";
import { Input } from "@/components/ui/input";

const MOOD_OPTIONS = [
  { value: "", label: "No mood", icon: <Radio className="w-4 h-4" /> },
  { value: "chill", label: "Chill", icon: <Sparkles className="w-4 h-4" />, color: "from-blue-500 to-cyan-400" },
  { value: "energetic", label: "Energetic", icon: <Zap className="w-4 h-4" />, color: "from-orange-500 to-yellow-400" },
  { value: "focus", label: "Focus", icon: <Focus className="w-4 h-4" />, color: "from-purple-500 to-indigo-400" },
  { value: "melancholic", label: "Melancholic", icon: <Heart className="w-4 h-4" />, color: "from-slate-500 to-slate-400" },
  { value: "uplifting", label: "Uplifting", icon: <Sun className="w-4 h-4" />, color: "from-green-500 to-emerald-400" },
];

interface Track {
  id: string;
  title: string;
  mood: string | null;
  release: { title: string } | null;
}

export default function AdminRadio() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [bulkMood, setBulkMood] = useState<string>("");

  // Fetch all tracks
  const { data: tracks, isLoading } = useQuery({
    queryKey: ["admin-radio-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          title,
          mood,
          release:releases(title)
        `)
        .order("title");

      if (error) throw error;
      return data as unknown as Track[];
    },
  });

  // Get mood stats
  const moodStats = tracks?.reduce((acc, track) => {
    const mood = track.mood || "unassigned";
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  // Update single track mood
  const updateMoodMutation = useMutation({
    mutationFn: async ({ trackId, mood }: { trackId: string; mood: string | null }) => {
      const { error } = await supabase
        .from("tracks")
        .update({ mood })
        .eq("id", trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-radio-tracks"] });
      toast.success("Track mood updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Bulk update moods
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ trackIds, mood }: { trackIds: string[]; mood: string | null }) => {
      const { error } = await supabase
        .from("tracks")
        .update({ mood })
        .in("id", trackIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-radio-tracks"] });
      setSelectedTracks([]);
      setBulkMood("");
      toast.success(`Updated ${selectedTracks.length} tracks`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleBulkUpdate = () => {
    if (selectedTracks.length === 0) {
      toast.error("Select tracks first");
      return;
    }
    bulkUpdateMutation.mutate({
      trackIds: selectedTracks,
      mood: bulkMood === "none" ? null : bulkMood || null,
    });
  };

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTracks((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  const toggleAllTracks = () => {
    if (filteredTracks && selectedTracks.length === filteredTracks.length) {
      setSelectedTracks([]);
    } else {
      setSelectedTracks(filteredTracks?.map((t) => t.id) || []);
    }
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
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Radio className="w-8 h-8 text-primary" />
            Radio Stations
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage track moods to populate radio stations
          </p>
        </div>

        {/* Station Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {MOOD_OPTIONS.map((mood) => {
            const count = mood.value ? moodStats[mood.value] || 0 : moodStats["unassigned"] || 0;
            return (
              <motion.div
                key={mood.value || "unassigned"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl ${
                  mood.color
                    ? `bg-gradient-to-br ${mood.color} text-white`
                    : "bg-muted"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {mood.icon}
                  <span className="font-medium text-sm">{mood.label || "Unassigned"}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className={`text-xs ${mood.color ? "text-white/70" : "text-muted-foreground"}`}>
                  tracks
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Bulk Actions */}
        {selectedTracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20"
          >
            <span className="text-sm font-medium">
              {selectedTracks.length} track{selectedTracks.length > 1 ? "s" : ""} selected
            </span>
            <Select value={bulkMood} onValueChange={setBulkMood}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Set mood..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4" />
                    <span>No mood</span>
                  </div>
                </SelectItem>
                {MOOD_OPTIONS.filter((m) => m.value).map((mood) => (
                  <SelectItem key={mood.value} value={mood.value}>
                    <div className="flex items-center gap-2">
                      {mood.icon}
                      <span>{mood.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleBulkUpdate}
              disabled={!bulkMood || bulkUpdateMutation.isPending}
            >
              {bulkUpdateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Apply
            </Button>
            <Button
              variant="ghost"
              onClick={() => setSelectedTracks([])}
            >
              Clear Selection
            </Button>
          </motion.div>
        )}

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
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredTracks &&
                        filteredTracks.length > 0 &&
                        selectedTracks.length === filteredTracks.length
                      }
                      onCheckedChange={toggleAllTracks}
                    />
                  </TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Release</TableHead>
                  <TableHead>Current Mood</TableHead>
                  <TableHead>Set Mood</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTracks?.map((track) => (
                  <TableRow key={track.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedTracks.includes(track.id)}
                        onCheckedChange={() => toggleTrackSelection(track.id)}
                      />
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
                          {MOOD_OPTIONS.find((m) => m.value === track.mood)?.icon}
                          {track.mood}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={track.mood || "none"}
                        onValueChange={(value) =>
                          updateMoodMutation.mutate({
                            trackId: track.id,
                            mood: value === "none" ? null : value,
                          })
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex items-center gap-2">
                              <Radio className="w-4 h-4" />
                              <span>No mood</span>
                            </div>
                          </SelectItem>
                          {MOOD_OPTIONS.filter((m) => m.value).map((mood) => (
                            <SelectItem key={mood.value} value={mood.value}>
                              <div className="flex items-center gap-2">
                                {mood.icon}
                                <span>{mood.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}