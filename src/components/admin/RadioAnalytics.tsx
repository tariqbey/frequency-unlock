import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Users,
  Music,
  Clock,
  Headphones,
  Radio,
  Sparkles,
  Zap,
  Focus,
  Heart,
  Sun,
  Loader2,
  BarChart3,
  Activity,
} from "lucide-react";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, eachHourOfInterval, startOfHour } from "date-fns";

const MOOD_COLORS: Record<string, string> = {
  chill: "#3b82f6",
  energetic: "#f97316",
  focus: "#8b5cf6",
  melancholic: "#64748b",
  uplifting: "#22c55e",
  all: "#6366f1",
};

const MOOD_ICONS: Record<string, React.ReactNode> = {
  chill: <Sparkles className="w-4 h-4" />,
  energetic: <Zap className="w-4 h-4" />,
  focus: <Focus className="w-4 h-4" />,
  melancholic: <Heart className="w-4 h-4" />,
  uplifting: <Sun className="w-4 h-4" />,
  all: <Radio className="w-4 h-4" />,
};

interface PlayEvent {
  id: string;
  track_id: string;
  created_at: string;
  metadata: {
    station_mood?: string;
    country_code?: string;
  } | null;
  track?: {
    title: string;
    release?: {
      title: string;
      artist?: { name: string };
    };
  };
}

export function RadioAnalytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("7d");

  const dateRange = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };

  const startDate = subDays(new Date(), dateRange[timeRange]);

  // Fetch play events
  const { data: playEvents, isLoading } = useQuery({
    queryKey: ["radio-analytics", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(`
          id,
          track_id,
          created_at,
          metadata,
          track:tracks(
            title,
            release:releases(
              title,
              artist:artists(name)
            )
          )
        `)
        .eq("event_type", "play_start")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as PlayEvent[];
    },
  });

  // Fetch radio stats
  const { data: radioStats } = useQuery({
    queryKey: ["radio-stats-analytics", timeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radio_stats")
        .select("*")
        .gte("played_at", startDate.toISOString())
        .order("played_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Calculate stats
  const totalPlays = playEvents?.length || 0;
  const uniqueTracks = new Set(playEvents?.map((e) => e.track_id)).size;
  
  // Unique listeners (approximation based on daily unique sessions)
  const uniqueListeners = new Set(
    playEvents?.map((e) => format(new Date(e.created_at), "yyyy-MM-dd"))
  ).size;

  // Average plays per day
  const avgPlaysPerDay = totalPlays / dateRange[timeRange];

  // Daily plays chart data
  const dailyPlaysData = eachDayOfInterval({
    start: startDate,
    end: new Date(),
  }).map((date) => {
    const dayPlays = playEvents?.filter((e) => {
      const eventDate = new Date(e.created_at);
      return (
        eventDate >= startOfDay(date) && eventDate <= endOfDay(date)
      );
    }).length || 0;

    return {
      date: format(date, "MMM d"),
      plays: dayPlays,
    };
  });

  // Hourly distribution (for today)
  const today = new Date();
  const hourlyData = Array.from({ length: 24 }, (_, hour) => {
    const hourPlays = playEvents?.filter((e) => {
      const eventDate = new Date(e.created_at);
      return eventDate.getHours() === hour;
    }).length || 0;

    return {
      hour: `${hour}:00`,
      plays: hourPlays,
    };
  });

  // Station/Mood distribution
  const moodDistribution = playEvents?.reduce((acc, event) => {
    const mood = (event.metadata as any)?.station_mood || "all";
    acc[mood] = (acc[mood] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const moodChartData = Object.entries(moodDistribution).map(([mood, count]) => ({
    name: mood.charAt(0).toUpperCase() + mood.slice(1),
    value: count,
    color: MOOD_COLORS[mood] || MOOD_COLORS.all,
  }));

  // Top tracks
  const trackCounts = playEvents?.reduce((acc, event) => {
    if (!event.track_id) return acc;
    if (!acc[event.track_id]) {
      acc[event.track_id] = {
        count: 0,
        title: event.track?.title || "Unknown",
        artist: event.track?.release?.artist?.name || "Unknown",
      };
    }
    acc[event.track_id].count++;
    return acc;
  }, {} as Record<string, { count: number; title: string; artist: string }>) || {};

  const topTracks = Object.entries(trackCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([id, data]) => ({
      id,
      ...data,
    }));

  // Geographic distribution (if available in metadata)
  const countryDistribution = playEvents?.reduce((acc, event) => {
    const country = (event.metadata as any)?.country_code || "Unknown";
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const topCountries = Object.entries(countryDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Radio Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track listening patterns and station performance
          </p>
        </div>
        <Select value={timeRange} onValueChange={(v: any) => setTimeRange(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Headphones className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPlays.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Plays</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Music className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{uniqueTracks}</p>
                  <p className="text-xs text-muted-foreground">Unique Tracks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{avgPlaysPerDay.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg Plays/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Activity className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{Object.keys(moodDistribution).length}</p>
                  <p className="text-xs text-muted-foreground">Active Stations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Plays Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Daily Plays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyPlaysData}>
                  <defs>
                    <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    className="text-xs fill-muted-foreground"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="plays"
                    stroke="hsl(var(--primary))"
                    fill="url(#colorPlays)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Station Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Station Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {moodChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={moodChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {moodChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">No data available</p>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {moodChartData.map((item) => (
                <Badge
                  key={item.name}
                  variant="outline"
                  className="flex items-center gap-1"
                  style={{ borderColor: item.color }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}: {item.value}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hourly Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Listening Patterns by Hour
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="hour" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 9 }}
                  interval={2}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar 
                  dataKey="plays" 
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tracks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Music className="w-4 h-4" />
              Top Tracks
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topTracks.length > 0 ? (
              <div className="space-y-3">
                {topTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3"
                  >
                    <span className="w-6 text-center font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artist}
                      </p>
                    </div>
                    <Badge variant="secondary">{track.count} plays</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">
                No play data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Geographic Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Top Regions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCountries.length > 0 && topCountries[0][0] !== "Unknown" ? (
              <div className="space-y-3">
                {topCountries.map(([country, count], index) => {
                  const percentage = ((count / totalPlays) * 100).toFixed(1);
                  return (
                    <div key={country} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{country}</span>
                        <span className="text-muted-foreground">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground text-sm">
                  Geographic data not available
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Location tracking requires user consent
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {totalPlays === 0 && (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <Radio className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-medium mb-1">No listening data yet</h3>
              <p className="text-sm text-muted-foreground">
                Analytics will appear once users start listening to the radio
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
