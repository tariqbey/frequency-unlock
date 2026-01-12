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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
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
  Star,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { format, isPast, isFuture, isWithinInterval } from "date-fns";

const MOOD_OPTIONS = [
  { value: "all", label: "All Stations", icon: <Radio className="w-4 h-4" /> },
  { value: "chill", label: "Chill", icon: <Sparkles className="w-4 h-4" />, color: "bg-blue-500" },
  { value: "energetic", label: "Energetic", icon: <Zap className="w-4 h-4" />, color: "bg-orange-500" },
  { value: "focus", label: "Focus", icon: <Focus className="w-4 h-4" />, color: "bg-purple-500" },
  { value: "melancholic", label: "Melancholic", icon: <Heart className="w-4 h-4" />, color: "bg-slate-500" },
  { value: "uplifting", label: "Uplifting", icon: <Sun className="w-4 h-4" />, color: "bg-green-500" },
];

const PRIORITY_OPTIONS = [
  { value: 5, label: "Low" },
  { value: 10, label: "Normal" },
  { value: 15, label: "High" },
  { value: 20, label: "Featured" },
];

interface ScheduleEntry {
  id: string;
  track_id: string;
  station_mood: string | null;
  starts_at: string;
  ends_at: string;
  priority: number;
  created_at: string;
  track: {
    id: string;
    title: string;
    release: {
      title: string;
      artist: { name: string };
    };
  };
}

interface Track {
  id: string;
  title: string;
  release: {
    title: string;
    artist: { name: string };
  };
}

export function RadioScheduleManager() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [formData, setFormData] = useState({
    track_id: "",
    station_mood: "all",
    starts_at: "",
    ends_at: "",
    priority: "10",
  });

  // Fetch scheduled entries
  const { data: scheduleEntries, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ["radio-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radio_schedule")
        .select(`
          id,
          track_id,
          station_mood,
          starts_at,
          ends_at,
          priority,
          created_at,
          track:tracks(
            id,
            title,
            release:releases(
              title,
              artist:artists(name)
            )
          )
        `)
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return data as unknown as ScheduleEntry[];
    },
  });

  // Fetch tracks for selection
  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ["radio-tracks-for-schedule"],
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
      return data as unknown as Track[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: {
      id?: string;
      track_id: string;
      station_mood: string | null;
      starts_at: string;
      ends_at: string;
      priority: number;
    }) => {
      if (data.id) {
        const { error } = await supabase
          .from("radio_schedule")
          .update({
            track_id: data.track_id,
            station_mood: data.station_mood,
            starts_at: data.starts_at,
            ends_at: data.ends_at,
            priority: data.priority,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("radio_schedule").insert({
          track_id: data.track_id,
          station_mood: data.station_mood,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
          priority: data.priority,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radio-schedule"] });
      toast.success(editingEntry ? "Schedule updated" : "Track scheduled");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("radio_schedule")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["radio-schedule"] });
      toast.success("Schedule entry removed");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleOpenDialog = (entry?: ScheduleEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormData({
        track_id: entry.track_id,
        station_mood: entry.station_mood || "all",
        starts_at: format(new Date(entry.starts_at), "yyyy-MM-dd'T'HH:mm"),
        ends_at: format(new Date(entry.ends_at), "yyyy-MM-dd'T'HH:mm"),
        priority: entry.priority.toString(),
      });
    } else {
      setEditingEntry(null);
      setFormData({
        track_id: "",
        station_mood: "all",
        starts_at: "",
        ends_at: "",
        priority: "10",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingEntry(null);
    setFormData({
      track_id: "",
      station_mood: "all",
      starts_at: "",
      ends_at: "",
      priority: "10",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.track_id || !formData.starts_at || !formData.ends_at) {
      toast.error("Please fill in all required fields");
      return;
    }

    const startsAt = new Date(formData.starts_at);
    const endsAt = new Date(formData.ends_at);

    if (endsAt <= startsAt) {
      toast.error("End time must be after start time");
      return;
    }

    saveMutation.mutate({
      id: editingEntry?.id,
      track_id: formData.track_id,
      station_mood: formData.station_mood === "all" ? null : formData.station_mood,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      priority: parseInt(formData.priority),
    });
  };

  const getEntryStatus = (entry: ScheduleEntry) => {
    const now = new Date();
    const starts = new Date(entry.starts_at);
    const ends = new Date(entry.ends_at);

    if (isPast(ends)) {
      return { label: "Expired", color: "bg-muted text-muted-foreground" };
    }
    if (isWithinInterval(now, { start: starts, end: ends })) {
      return { label: "Active", color: "bg-green-500 text-white" };
    }
    if (isFuture(starts)) {
      return { label: "Scheduled", color: "bg-blue-500 text-white" };
    }
    return { label: "Unknown", color: "bg-muted" };
  };

  const getMoodDisplay = (mood: string | null) => {
    const option = MOOD_OPTIONS.find((m) => m.value === (mood || "all"));
    return option || MOOD_OPTIONS[0];
  };

  const getPriorityDisplay = (priority: number) => {
    if (priority >= 20) return { label: "Featured", icon: <Star className="w-3 h-3" /> };
    if (priority >= 15) return { label: "High", icon: null };
    if (priority >= 10) return { label: "Normal", icon: null };
    return { label: "Low", icon: null };
  };

  // Separate entries by status
  const activeEntries = scheduleEntries?.filter((e) => {
    const now = new Date();
    return isWithinInterval(now, { start: new Date(e.starts_at), end: new Date(e.ends_at) });
  }) || [];

  const upcomingEntries = scheduleEntries?.filter((e) => isFuture(new Date(e.starts_at))) || [];
  const expiredEntries = scheduleEntries?.filter((e) => isPast(new Date(e.ends_at))) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Track Scheduling
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule tracks to play during specific time periods
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Schedule Track
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingEntry ? "Edit Schedule" : "Schedule a Track"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="track">Track *</Label>
                <Select
                  value={formData.track_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, track_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a track..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {tracks?.map((track) => (
                      <SelectItem key={track.id} value={track.id}>
                        <div className="flex flex-col">
                          <span>{track.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {track.release?.artist?.name} - {track.release?.title}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="station">Station</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Start Time *</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={formData.starts_at}
                    onChange={(e) =>
                      setFormData({ ...formData, starts_at: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ends_at">End Time *</Label>
                  <Input
                    id="ends_at"
                    type="datetime-local"
                    value={formData.ends_at}
                    onChange={(e) =>
                      setFormData({ ...formData, ends_at: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value.toString()}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher priority tracks are more likely to play during their scheduled time
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingEntry ? "Update" : "Schedule"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Now Section */}
      {activeEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <h3 className="font-medium text-green-500 flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Active Now
          </h3>
          <div className="space-y-2">
            {activeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Music className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium">{entry.track?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.track?.release?.artist?.name} • Ends {format(new Date(entry.ends_at), "h:mm a")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getMoodDisplay(entry.station_mood).icon}
                    {getMoodDisplay(entry.station_mood).label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Schedule Table */}
      <div className="glass-panel rounded-xl overflow-hidden">
        {isLoadingSchedule ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : scheduleEntries?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="w-12 h-12 mb-4 opacity-50" />
            <p>No scheduled tracks</p>
            <p className="text-sm">Schedule tracks to promote them during specific times</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Track</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Time Period</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {scheduleEntries?.map((entry) => {
                  const status = getEntryStatus(entry);
                  const moodDisplay = getMoodDisplay(entry.station_mood);
                  const priorityDisplay = getPriorityDisplay(entry.priority);

                  return (
                    <motion.tr
                      key={entry.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border-b ${status.label === "Expired" ? "opacity-50" : ""}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Music className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{entry.track?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {entry.track?.release?.artist?.name} - {entry.track?.release?.title}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {moodDisplay.icon}
                          <span>{moodDisplay.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(entry.starts_at), "MMM d, h:mm a")}
                          </span>
                          <span className="text-muted-foreground">
                            to {format(new Date(entry.ends_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {priorityDisplay.icon}
                          <span>{priorityDisplay.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>{status.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(entry)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(entry.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <div className="flex items-center gap-2 text-green-500 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium">Active</span>
          </div>
          <p className="text-2xl font-bold">{activeEntries.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Upcoming</span>
          </div>
          <p className="text-2xl font-bold">{upcomingEntries.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-muted">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Expired</span>
          </div>
          <p className="text-2xl font-bold">{expiredEntries.length}</p>
        </div>
      </div>
    </div>
  );
}
