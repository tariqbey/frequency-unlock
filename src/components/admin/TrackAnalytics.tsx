import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Play, Heart, Share2, TrendingUp, Music, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["hsl(45, 90%, 55%)", "hsl(200, 80%, 50%)", "hsl(340, 80%, 55%)", "hsl(120, 60%, 45%)", "hsl(280, 70%, 50%)"];

export function TrackAnalytics() {
  // Fetch track analytics data
  const { data: trackStats } = useQuery({
    queryKey: ["admin-track-analytics"],
    queryFn: async () => {
      // Get all tracks with release info
      const { data: tracks, error: tracksError } = await supabase
        .from("tracks")
        .select(`
          id,
          title,
          release:releases(title, artist:artists(name))
        `);

      if (tracksError) throw tracksError;

      // Get play events per track
      const { data: playEvents } = await supabase
        .from("events")
        .select("track_id, user_id, created_at")
        .eq("event_type", "play_start")
        .not("track_id", "is", null);

      // Get favorite counts per track
      const { data: favorites } = await supabase
        .from("favorite_tracks")
        .select("track_id");

      // Get share counts per track
      const { data: shares } = await supabase
        .from("shares")
        .select("track_id, platform");

      // Aggregate stats per track
      const trackPlayCounts: Record<string, number> = {};
      const uniqueListeners: Record<string, Set<string>> = {};
      
      playEvents?.forEach((e) => {
        if (e.track_id) {
          trackPlayCounts[e.track_id] = (trackPlayCounts[e.track_id] || 0) + 1;
          if (!uniqueListeners[e.track_id]) uniqueListeners[e.track_id] = new Set();
          if (e.user_id) uniqueListeners[e.track_id].add(e.user_id);
        }
      });

      const trackFavoriteCounts: Record<string, number> = {};
      favorites?.forEach((f) => {
        trackFavoriteCounts[f.track_id] = (trackFavoriteCounts[f.track_id] || 0) + 1;
      });

      const trackShareCounts: Record<string, number> = {};
      const sharePlatforms: Record<string, number> = {};
      shares?.forEach((s) => {
        if (s.track_id) {
          trackShareCounts[s.track_id] = (trackShareCounts[s.track_id] || 0) + 1;
        }
        sharePlatforms[s.platform] = (sharePlatforms[s.platform] || 0) + 1;
      });

      // Build enriched track data
      const enrichedTracks = tracks?.map((t) => ({
        id: t.id,
        title: t.title,
        artist: (t.release as any)?.artist?.name || "Unknown",
        release: (t.release as any)?.title || "Unknown",
        plays: trackPlayCounts[t.id] || 0,
        uniqueListeners: uniqueListeners[t.id]?.size || 0,
        likes: trackFavoriteCounts[t.id] || 0,
        shares: trackShareCounts[t.id] || 0,
      })) || [];

      // Sort by plays for top tracks
      const topByPlays = [...enrichedTracks].sort((a, b) => b.plays - a.plays).slice(0, 10);
      const topByLikes = [...enrichedTracks].sort((a, b) => b.likes - a.likes).slice(0, 10);
      const topByShares = [...enrichedTracks].sort((a, b) => b.shares - a.shares).slice(0, 10);

      // Platform distribution for shares
      const platformData = Object.entries(sharePlatforms).map(([platform, count]) => ({
        name: platform.charAt(0).toUpperCase() + platform.slice(1).replace("_", " "),
        value: count,
      }));

      // Total stats
      const totalPlays = Object.values(trackPlayCounts).reduce((a, b) => a + b, 0);
      const totalLikes = Object.values(trackFavoriteCounts).reduce((a, b) => a + b, 0);
      const totalShares = Object.values(trackShareCounts).reduce((a, b) => a + b, 0);
      const allUniqueListeners = new Set(playEvents?.map((e) => e.user_id).filter(Boolean));

      return {
        topByPlays,
        topByLikes,
        topByShares,
        platformData,
        totals: {
          plays: totalPlays,
          likes: totalLikes,
          shares: totalShares,
          uniqueListeners: allUniqueListeners.size,
        },
      };
    },
  });

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Play className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trackStats?.totals.plays.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Total Plays</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trackStats?.totals.likes.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Total Likes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trackStats?.totals.shares.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Total Shares</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{trackStats?.totals.uniqueListeners.toLocaleString() || 0}</p>
              <p className="text-xs text-muted-foreground">Unique Listeners</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tracks by Plays */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Top Tracks by Plays
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trackStats?.topByPlays.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="title" type="category" width={100} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="plays" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Share Platform Distribution */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-500" />
              Share Platforms
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trackStats?.platformData && trackStats.platformData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={trackStats.platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {trackStats.platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No share data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Track List */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Track Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="plays">
            <TabsList>
              <TabsTrigger value="plays">By Plays</TabsTrigger>
              <TabsTrigger value="likes">By Likes</TabsTrigger>
              <TabsTrigger value="shares">By Shares</TabsTrigger>
            </TabsList>
            <TabsContent value="plays" className="mt-4">
              <div className="space-y-2">
                {trackStats?.topByPlays.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{track.title}</p>
                        <p className="text-xs text-muted-foreground">{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="gap-1">
                        <Play className="w-3 h-3" />
                        {track.plays}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Heart className="w-3 h-3" />
                        {track.likes}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Share2 className="w-3 h-3" />
                        {track.shares}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="likes" className="mt-4">
              <div className="space-y-2">
                {trackStats?.topByLikes.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{track.title}</p>
                        <p className="text-xs text-muted-foreground">{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="gap-1 bg-pink-500/10 text-pink-500">
                        <Heart className="w-3 h-3" />
                        {track.likes}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="shares" className="mt-4">
              <div className="space-y-2">
                {trackStats?.topByShares.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{track.title}</p>
                        <p className="text-xs text-muted-foreground">{track.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-500">
                        <Share2 className="w-3 h-3" />
                        {track.shares}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
