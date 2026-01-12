import { useState, useRef } from "react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
  Play,
  Pause,
  Volume2,
  Calendar,
  TrendingUp,
  Clock,
  BarChart3,
  Settings2,
  Star,
  Power,
  ListMusic,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { RadioScheduleManager } from "@/components/admin/RadioScheduleManager";

const MOOD_OPTIONS = [
  { value: "", label: "No mood", icon: <Radio className="w-4 h-4" /> },
  { value: "chill", label: "Chill", icon: <Sparkles className="w-4 h-4" />, color: "from-blue-500 to-cyan-400" },
  { value: "energetic", label: "Energetic", icon: <Zap className="w-4 h-4" />, color: "from-orange-500 to-yellow-400" },
  { value: "focus", label: "Focus", icon: <Focus className="w-4 h-4" />, color: "from-purple-500 to-indigo-400" },
  { value: "melancholic", label: "Melancholic", icon: <Heart className="w-4 h-4" />, color: "from-slate-500 to-slate-400" },
  { value: "uplifting", label: "Uplifting", icon: <Sun className="w-4 h-4" />, color: "from-green-500 to-emerald-400" },
];

const PRIORITY_OPTIONS = [
  { value: 0, label: "Normal" },
  { value: 1, label: "Low Priority" },
  { value: 2, label: "Medium Priority" },
  { value: 3, label: "High Priority" },
  { value: 4, label: "Featured" },
];

interface Track {
  id: string;
  title: string;
  mood: string | null;
  audio_path: string;
  radio_enabled: boolean;
  radio_priority: number;
  last_played_at: string | null;
  release: { title: string; artist: { name: string } } | null;
}

interface RadioStats {
  totalTracks: number;
  enabledTracks: number;
  tracksPerStation: Record<string, number>;
  recentPlays: number;
}

export default function AdminRadio() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [bulkMood, setBulkMood] = useState<string>("");
  const [bulkPriority, setBulkPriority] = useState<string>("");
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [filterMood, setFilterMood] = useState<string>("all");
  const [filterEnabled, setFilterEnabled] = useState<string>("all");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch all tracks with radio fields
  const { data: tracks, isLoading } = useQuery({
    queryKey: ["admin-radio-tracks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          title,
          mood,
          audio_path,
          radio_enabled,
          radio_priority,
          last_played_at,
          release:releases(title, artist:artists(name))
        `)
        .order("radio_priority", { ascending: false })
        .order("title");

      if (error) throw error;
      return data as unknown as Track[];
    },
  });

  // Fetch radio stats
  const { data: radioStats } = useQuery({
    queryKey: ["admin-radio-stats"],
    queryFn: async () => {
      const { data: statsData, error: statsError } = await supabase
        .from("radio_stats")
        .select("*")
        .gte("played_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (statsError) throw statsError;

      return {
        recentPlays: statsData?.length || 0,
      };
    },
  });

  // Handle track preview
  const handlePreview = async (track: Track) => {
    if (playingTrackId === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (playingTrackId === track.id && !isPlaying) {
      audioRef.current?.play();
      setIsPlaying(true);
      return;
    }

    const { data: signedData, error } = await supabase.storage
      .from("audio")
      .createSignedUrl(track.audio_path, 3600);

    if (error || !signedData?.signedUrl) {
      toast.error("Failed to load audio");
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(signedData.signedUrl);
    audio.volume = volume;
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    });

    audio.addEventListener("ended", () => {
      setIsPlaying(false);
      setProgress(0);
      setPlayingTrackId(null);
    });

    audio.play();
    setPlayingTrackId(track.id);
    setIsPlaying(true);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Get stats
  const stats: RadioStats = {
    totalTracks: tracks?.length || 0,
    enabledTracks: tracks?.filter((t) => t.radio_enabled).length || 0,
    tracksPerStation: tracks?.reduce((acc, track) => {
      const mood = track.mood || "unassigned";
      if (track.radio_enabled) {
        acc[mood] = (acc[mood] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) || {},
    recentPlays: radioStats?.recentPlays || 0,
  };

  // Update single track
  const updateTrackMutation = useMutation({
    mutationFn: async (updates: { trackId: string; mood?: string | null; radio_enabled?: boolean; radio_priority?: number }) => {
      const updateData: any = {};
      if (updates.mood !== undefined) updateData.mood = updates.mood;
      if (updates.radio_enabled !== undefined) updateData.radio_enabled = updates.radio_enabled;
      if (updates.radio_priority !== undefined) updateData.radio_priority = updates.radio_priority;

      const { error } = await supabase
        .from("tracks")
        .update(updateData)
        .eq("id", updates.trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-radio-tracks"] });
      toast.success("Track updated");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Bulk update
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ trackIds, mood, radio_enabled, radio_priority }: { 
      trackIds: string[]; 
      mood?: string | null; 
      radio_enabled?: boolean;
      radio_priority?: number;
    }) => {
      const updateData: any = {};
      if (mood !== undefined) updateData.mood = mood;
      if (radio_enabled !== undefined) updateData.radio_enabled = radio_enabled;
      if (radio_priority !== undefined) updateData.radio_priority = radio_priority;

      const { error } = await supabase
        .from("tracks")
        .update(updateData)
        .in("id", trackIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-radio-tracks"] });
      setSelectedTracks([]);
      setBulkMood("");
      setBulkPriority("");
      toast.success(`Updated ${selectedTracks.length} tracks`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleBulkMoodUpdate = () => {
    if (selectedTracks.length === 0) {
      toast.error("Select tracks first");
      return;
    }
    bulkUpdateMutation.mutate({
      trackIds: selectedTracks,
      mood: bulkMood === "none" ? null : bulkMood || undefined,
    });
  };

  const handleBulkPriorityUpdate = () => {
    if (selectedTracks.length === 0) {
      toast.error("Select tracks first");
      return;
    }
    bulkUpdateMutation.mutate({
      trackIds: selectedTracks,
      radio_priority: parseInt(bulkPriority),
    });
  };

  const handleBulkEnableDisable = (enabled: boolean) => {
    if (selectedTracks.length === 0) {
      toast.error("Select tracks first");
      return;
    }
    bulkUpdateMutation.mutate({
      trackIds: selectedTracks,
      radio_enabled: enabled,
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

  const filteredTracks = tracks?.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.release?.title.toLowerCase().includes(search.toLowerCase()) ||
      t.release?.artist.name.toLowerCase().includes(search.toLowerCase());
    
    const matchesMood = filterMood === "all" || 
      (filterMood === "unassigned" && !t.mood) ||
      t.mood === filterMood;
    
    const matchesEnabled = filterEnabled === "all" ||
      (filterEnabled === "enabled" && t.radio_enabled) ||
      (filterEnabled === "disabled" && !t.radio_enabled);
    
    return matchesSearch && matchesMood && matchesEnabled;
  });

  const getPriorityBadge = (priority: number) => {
    const option = PRIORITY_OPTIONS.find((p) => p.value === priority);
    if (!option || priority === 0) return null;
    
    const colors: Record<number, string> = {
      1: "bg-slate-500/20 text-slate-400",
      2: "bg-blue-500/20 text-blue-400",
      3: "bg-orange-500/20 text-orange-400",
      4: "bg-yellow-500/20 text-yellow-400",
    };
    
    return (
      <Badge variant="outline" className={colors[priority]}>
        {priority === 4 && <Star className="w-3 h-3 mr-1" />}
        {option.label}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold flex items-center gap-3">
              <Radio className="w-8 h-8 text-primary" />
              Radio Management
            </h1>
            <p className="mt-1 text-muted-foreground">
              Control what plays on the radio, set priorities, and manage stations
            </p>
          </div>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="tracks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tracks" className="gap-2">
              <ListMusic className="w-4 h-4" />
              Track Library
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Calendar className="w-4 h-4" />
              Scheduling
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Music className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalTracks}</p>
                  <p className="text-xs text-muted-foreground">Total Tracks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Power className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.enabledTracks}</p>
                  <p className="text-xs text-muted-foreground">Radio Enabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <BarChart3 className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.recentPlays}</p>
                  <p className="text-xs text-muted-foreground">Plays (24h)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Star className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {tracks?.filter((t) => t.radio_priority >= 3).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">High Priority</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Station Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {MOOD_OPTIONS.map((mood) => {
            const count = mood.value 
              ? stats.tracksPerStation[mood.value] || 0 
              : stats.tracksPerStation["unassigned"] || 0;
            return (
              <motion.div
                key={mood.value || "unassigned"}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  mood.color
                    ? `bg-gradient-to-br ${mood.color} text-white`
                    : "bg-muted"
                } ${filterMood === (mood.value || "unassigned") ? "ring-2 ring-white/50 scale-105" : ""}`}
                onClick={() => setFilterMood(mood.value || "unassigned")}
              >
                <div className="flex items-center gap-2 mb-2">
                  {mood.icon}
                  <span className="font-medium text-sm">{mood.label || "Unassigned"}</span>
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className={`text-xs ${mood.color ? "text-white/70" : "text-muted-foreground"}`}>
                  enabled tracks
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Bulk Actions */}
        <AnimatePresence>
          {selectedTracks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-primary/10 border border-primary/20"
            >
              <span className="text-sm font-medium">
                {selectedTracks.length} track{selectedTracks.length > 1 ? "s" : ""} selected
              </span>
              
              <div className="flex items-center gap-2">
                <Select value={bulkMood} onValueChange={setBulkMood}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Set mood..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No mood</SelectItem>
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
                  size="sm"
                  onClick={handleBulkMoodUpdate}
                  disabled={!bulkMood || bulkUpdateMutation.isPending}
                >
                  Apply
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Select value={bulkPriority} onValueChange={setBulkPriority}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Set priority..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value.toString()}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleBulkPriorityUpdate}
                  disabled={!bulkPriority || bulkUpdateMutation.isPending}
                >
                  Apply
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkEnableDisable(true)}
                  disabled={bulkUpdateMutation.isPending}
                  className="text-green-500 border-green-500/30"
                >
                  <Power className="w-4 h-4 mr-1" />
                  Enable
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkEnableDisable(false)}
                  disabled={bulkUpdateMutation.isPending}
                  className="text-red-500 border-red-500/30"
                >
                  <Power className="w-4 h-4 mr-1" />
                  Disable
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTracks([])}
              >
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tracks, releases, artists..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterMood} onValueChange={setFilterMood}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter mood" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Moods</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
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

          <Select value={filterEnabled} onValueChange={setFilterEnabled}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="enabled">Enabled</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 ml-auto">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
          </div>
        </div>

        {/* Track Table */}
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
                  <TableHead className="w-12">Radio</TableHead>
                  <TableHead className="w-14">Preview</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Mood</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Last Played</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTracks?.map((track) => (
                  <TableRow 
                    key={track.id}
                    className={!track.radio_enabled ? "opacity-50" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedTracks.includes(track.id)}
                        onCheckedChange={() => toggleTrackSelection(track.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={track.radio_enabled}
                        onCheckedChange={(checked) =>
                          updateTrackMutation.mutate({
                            trackId: track.id,
                            radio_enabled: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full"
                        onClick={() => handlePreview(track)}
                      >
                        {playingTrackId === track.id && isPlaying ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded flex items-center justify-center ${
                          playingTrackId === track.id ? "bg-primary/20" : "bg-muted"
                        }`}>
                          <Music className={`w-5 h-5 ${
                            playingTrackId === track.id ? "text-primary" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{track.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {track.release?.title}
                          </span>
                          {playingTrackId === track.id && (
                            <div className="w-24 h-1 bg-muted rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-200"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {track.release?.artist?.name || "—"}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={track.mood || "none"}
                        onValueChange={(value) =>
                          updateTrackMutation.mutate({
                            trackId: track.id,
                            mood: value === "none" ? null : value,
                          })
                        }
                      >
                        <SelectTrigger className="w-32">
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={track.radio_priority.toString()}
                          onValueChange={(value) =>
                            updateTrackMutation.mutate({
                              trackId: track.id,
                              radio_priority: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger className="w-36">
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
                        {getPriorityBadge(track.radio_priority)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {track.last_played_at ? (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(track.last_played_at), "MMM d, h:mm a")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filteredTracks?.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Music className="w-12 h-12 mb-4 opacity-50" />
              <p>No tracks found matching your filters</p>
            </div>
          )}
        </motion.div>
          </TabsContent>

          <TabsContent value="schedule">
            <RadioScheduleManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
