import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { LiveActivityFeed } from "@/components/admin/LiveActivityFeed";
import { GeoDistributionMap } from "@/components/admin/GeoDistributionMap";
import { UserEngagementMetrics } from "@/components/admin/UserEngagementMetrics";
import { TrackAnalytics } from "@/components/admin/TrackAnalytics";
import { AlbumUploader } from "@/components/admin/AlbumUploader";
import { Button } from "@/components/ui/button";
import { 
  Disc3, Music, DollarSign, Users, Radio, Mic2, 
  PlayCircle, Download, Star, TrendingUp, Trophy, Crown, Upload, BarChart3
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const MOOD_CONFIG = [
  { value: "energetic", label: "Energetic", color: "hsl(25, 95%, 55%)" },
  { value: "chill", label: "Chill", color: "hsl(200, 80%, 50%)" },
  { value: "melancholic", label: "Melancholic", color: "hsl(260, 60%, 55%)" },
  { value: "uplifting", label: "Uplifting", color: "hsl(45, 90%, 55%)" },
  { value: "dark", label: "Dark", color: "hsl(280, 70%, 40%)" },
  { value: "romantic", label: "Romantic", color: "hsl(340, 80%, 55%)" },
  { value: "dreamy", label: "Dreamy", color: "hsl(180, 60%, 50%)" },
  { value: null, label: "Unassigned", color: "hsl(var(--muted-foreground))" },
];

export default function AdminDashboard() {
  const [albumUploaderOpen, setAlbumUploaderOpen] = useState(false);
  // Fetch stats with trends
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        releasesRes, 
        tracksRes, 
        donationsRes, 
        donationsPrevRes,
        usersRes, 
        artistsRes,
        featuredArtistsRes,
        eventsRes,
        eventsPrevRes,
        moodTracksRes,
        recentUsersRes,
        recentReleasesRes,
      ] = await Promise.all([
        supabase.from("releases").select("id", { count: "exact", head: true }),
        supabase.from("tracks").select("id", { count: "exact", head: true }),
        supabase.from("donations").select("amount_cents, created_at").eq("status", "paid").gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("donations").select("amount_cents").eq("status", "paid").gte("created_at", sixtyDaysAgo.toISOString()).lt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("artists").select("id", { count: "exact", head: true }),
        supabase.from("artists").select("id", { count: "exact", head: true }).eq("is_featured", true),
        supabase.from("events").select("created_at, event_type").gte("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("events").select("event_type").gte("created_at", sixtyDaysAgo.toISOString()).lt("created_at", thirtyDaysAgo.toISOString()),
        supabase.from("tracks").select("mood"),
        supabase.from("profiles").select("created_at").gte("created_at", sevenDaysAgo.toISOString()),
        supabase.from("releases").select("created_at").gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      // Calculate revenues
      const currentRevenue = donationsRes.data?.reduce((sum, d) => sum + d.amount_cents, 0) || 0;
      const prevRevenue = donationsPrevRes.data?.reduce((sum, d) => sum + d.amount_cents, 0) || 0;
      const revenueChange = prevRevenue > 0 ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100) : 0;

      // Calculate plays
      const currentPlays = eventsRes.data?.filter(e => e.event_type === "play_start").length || 0;
      const prevPlays = eventsPrevRes.data?.filter(e => e.event_type === "play_start").length || 0;
      const playsChange = prevPlays > 0 ? Math.round(((currentPlays - prevPlays) / prevPlays) * 100) : 0;

      // Calculate downloads
      const currentDownloads = eventsRes.data?.filter(e => e.event_type === "download").length || 0;
      const prevDownloads = eventsPrevRes.data?.filter(e => e.event_type === "download").length || 0;
      const downloadsChange = prevDownloads > 0 ? Math.round(((currentDownloads - prevDownloads) / prevDownloads) * 100) : 0;

      // Generate sparkline data (last 7 days of revenue)
      const revenueByDay: Record<string, number> = {};
      donationsRes.data?.forEach(d => {
        const day = new Date(d.created_at).toDateString();
        revenueByDay[day] = (revenueByDay[day] || 0) + d.amount_cents;
      });
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        return revenueByDay[date.toDateString()] || 0;
      });

      // Generate plays sparkline
      const playsByDay: Record<string, number> = {};
      eventsRes.data?.filter(e => e.event_type === "play_start").forEach(e => {
        const day = new Date(e.created_at).toDateString();
        playsByDay[day] = (playsByDay[day] || 0) + 1;
      });
      const playsLast7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        return playsByDay[date.toDateString()] || 0;
      });

      // Calculate mood distribution
      const moodCounts = (moodTracksRes.data || []).reduce((acc: Record<string, number>, track) => {
        const mood = track.mood || "null";
        acc[mood] = (acc[mood] || 0) + 1;
        return acc;
      }, {});

      const moodDistribution = MOOD_CONFIG.map((m) => ({
        name: m.label,
        value: moodCounts[m.value || "null"] || 0,
        color: m.color,
      })).filter((m) => m.value > 0);

      // Top release types
      const publishedReleasesRes = await supabase.from("releases").select("type").eq("is_published", true);
      const releaseTypeCounts = (publishedReleasesRes.data || []).reduce((acc: Record<string, number>, r) => {
        acc[r.type] = (acc[r.type] || 0) + 1;
        return acc;
      }, {});

      return {
        releases: releasesRes.count || 0,
        tracks: tracksRes.count || 0,
        revenue: currentRevenue,
        revenueChange,
        revenueTrend: revenueChange >= 0 ? "positive" : "negative",
        revenueSparkline: last7Days,
        users: usersRes.count || 0,
        newUsers: recentUsersRes.data?.length || 0,
        artists: artistsRes.count || 0,
        featuredArtists: featuredArtistsRes.count || 0,
        plays: currentPlays,
        playsChange,
        playsTrend: playsChange >= 0 ? "positive" : "negative",
        playsSparkline: playsLast7Days,
        downloads: currentDownloads,
        downloadsChange,
        downloadsTrend: downloadsChange >= 0 ? "positive" : "negative",
        newReleases: recentReleasesRes.data?.length || 0,
        recentEvents: eventsRes.data || [],
        moodDistribution,
        releaseTypes: [
          { name: "Albums", value: releaseTypeCounts["album"] || 0 },
          { name: "EPs", value: releaseTypeCounts["ep"] || 0 },
          { name: "Singles", value: releaseTypeCounts["single"] || 0 },
        ],
      };
    },
  });

  // Recent donations
  const { data: recentDonations } = useQuery({
    queryKey: ["admin-recent-donations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select(`
          id,
          amount_cents,
          created_at,
          status,
          release:releases(title)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
  });

  // Top releases by plays and donations
  const { data: topReleases } = useQuery({
    queryKey: ["admin-top-releases"],
    queryFn: async () => {
      // Get all releases with their info
      const { data: releases, error: releasesError } = await supabase
        .from("releases")
        .select(`
          id,
          title,
          cover_art_url,
          artist_id,
          artist:artists(name)
        `)
        .eq("is_published", true);

      if (releasesError) throw releasesError;

      // Get play counts per release
      const { data: playEvents, error: playsError } = await supabase
        .from("events")
        .select("release_id")
        .eq("event_type", "play_start")
        .not("release_id", "is", null);

      if (playsError) throw playsError;

      // Get donation totals per release
      const { data: donations, error: donationsError } = await supabase
        .from("donations")
        .select("release_id, amount_cents")
        .eq("status", "paid");

      if (donationsError) throw donationsError;

      // Aggregate plays by release
      const playsByRelease: Record<string, number> = {};
      playEvents?.forEach((e) => {
        if (e.release_id) {
          playsByRelease[e.release_id] = (playsByRelease[e.release_id] || 0) + 1;
        }
      });

      // Aggregate donations by release
      const donationsByRelease: Record<string, number> = {};
      donations?.forEach((d) => {
        donationsByRelease[d.release_id] = (donationsByRelease[d.release_id] || 0) + d.amount_cents;
      });

      // Combine data
      const enrichedReleases = releases?.map((r) => ({
        id: r.id,
        title: r.title,
        coverArt: r.cover_art_url,
        artistId: r.artist_id,
        artist: (r.artist as any)?.name || "Unknown Artist",
        plays: playsByRelease[r.id] || 0,
        donations: donationsByRelease[r.id] || 0,
      })) || [];

      // Sort by plays (top played)
      const topByPlays = [...enrichedReleases]
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      // Sort by donations (top earning)
      const topByDonations = [...enrichedReleases]
        .sort((a, b) => b.donations - a.donations)
        .slice(0, 5);

      return { topByPlays, topByDonations, allReleases: enrichedReleases };
    },
  });

  // Top artists by plays and earnings
  const { data: topArtists } = useQuery({
    queryKey: ["admin-top-artists"],
    queryFn: async () => {
      // Get all artists
      const { data: artists, error: artistsError } = await supabase
        .from("artists")
        .select("id, name, image_url");

      if (artistsError) throw artistsError;

      // Get all releases with artist info
      const { data: releases, error: releasesError } = await supabase
        .from("releases")
        .select("id, artist_id")
        .eq("is_published", true);

      if (releasesError) throw releasesError;

      // Get play counts per release
      const { data: playEvents, error: playsError } = await supabase
        .from("events")
        .select("release_id")
        .eq("event_type", "play_start")
        .not("release_id", "is", null);

      if (playsError) throw playsError;

      // Get donation totals per release
      const { data: donations, error: donationsError } = await supabase
        .from("donations")
        .select("release_id, amount_cents")
        .eq("status", "paid");

      if (donationsError) throw donationsError;

      // Map release to artist
      const releaseToArtist: Record<string, string> = {};
      releases?.forEach((r) => {
        releaseToArtist[r.id] = r.artist_id;
      });

      // Aggregate plays by artist
      const playsByArtist: Record<string, number> = {};
      playEvents?.forEach((e) => {
        if (e.release_id) {
          const artistId = releaseToArtist[e.release_id];
          if (artistId) {
            playsByArtist[artistId] = (playsByArtist[artistId] || 0) + 1;
          }
        }
      });

      // Aggregate donations by artist
      const donationsByArtist: Record<string, number> = {};
      donations?.forEach((d) => {
        const artistId = releaseToArtist[d.release_id];
        if (artistId) {
          donationsByArtist[artistId] = (donationsByArtist[artistId] || 0) + d.amount_cents;
        }
      });

      // Count releases per artist
      const releasesByArtist: Record<string, number> = {};
      releases?.forEach((r) => {
        releasesByArtist[r.artist_id] = (releasesByArtist[r.artist_id] || 0) + 1;
      });

      // Combine data
      const enrichedArtists = artists?.map((a) => ({
        id: a.id,
        name: a.name,
        imageUrl: a.image_url,
        plays: playsByArtist[a.id] || 0,
        earnings: donationsByArtist[a.id] || 0,
        releases: releasesByArtist[a.id] || 0,
      })) || [];

      // Sort by plays
      const topByPlays = [...enrichedArtists]
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 5);

      // Sort by earnings
      const topByEarnings = [...enrichedArtists]
        .sort((a, b) => b.earnings - a.earnings)
        .slice(0, 5);

      return { topByPlays, topByEarnings };
    },
  });

  // Chart data - aggregate events by day
  const chartData = stats?.recentEvents.reduce((acc: any[], event) => {
    const date = new Date(event.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const existing = acc.find((d) => d.date === date);
    if (existing) {
      existing.plays += event.event_type === "play_start" ? 1 : 0;
      existing.donations += event.event_type === "donation_paid" ? 1 : 0;
    } else {
      acc.push({
        date,
        plays: event.event_type === "play_start" ? 1 : 0,
        donations: event.event_type === "donation_paid" ? 1 : 0,
      });
    }
    return acc;
  }, []) || [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header with Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Overview of your music platform
            </p>
          </div>
          <Button 
            size="lg" 
            onClick={() => setAlbumUploaderOpen(true)}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Album
          </Button>
        </div>

        {/* Album Uploader Dialog */}
        <AlbumUploader open={albumUploaderOpen} onOpenChange={setAlbumUploaderOpen} />

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Revenue"
            value={`$${((stats?.revenue || 0) / 100).toFixed(0)}`}
            change="Last 30 days"
            changeType={stats?.revenueTrend as "positive" | "negative" | "neutral"}
            changeValue={stats?.revenueChange}
            icon={<DollarSign className="w-6 h-6" />}
            delay={0}
            sparklineData={stats?.revenueSparkline}
            gradient="from-emerald-600 to-teal-500"
          />
          <StatsCard
            title="Total Plays"
            value={stats?.plays?.toLocaleString() || 0}
            change="Last 30 days"
            changeType={stats?.playsTrend as "positive" | "negative" | "neutral"}
            changeValue={stats?.playsChange}
            icon={<PlayCircle className="w-6 h-6" />}
            delay={0.05}
            sparklineData={stats?.playsSparkline}
            gradient="from-violet-600 to-purple-500"
          />
          <StatsCard
            title="Downloads"
            value={stats?.downloads?.toLocaleString() || 0}
            change="Last 30 days"
            changeType={stats?.downloadsTrend as "positive" | "negative" | "neutral"}
            changeValue={stats?.downloadsChange}
            icon={<Download className="w-6 h-6" />}
            delay={0.1}
            gradient="from-blue-600 to-cyan-500"
          />
          <StatsCard
            title="New Users"
            value={stats?.newUsers || 0}
            change="Last 7 days"
            changeType="neutral"
            icon={<TrendingUp className="w-6 h-6" />}
            delay={0.15}
            gradient="from-orange-600 to-amber-500"
          />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatsCard
            title="Artists"
            value={stats?.artists || 0}
            icon={<Mic2 className="w-5 h-5" />}
            delay={0.2}
          />
          <StatsCard
            title="Featured"
            value={stats?.featuredArtists || 0}
            icon={<Star className="w-5 h-5" />}
            delay={0.22}
          />
          <StatsCard
            title="Releases"
            value={stats?.releases || 0}
            change={`+${stats?.newReleases || 0} this week`}
            changeType="neutral"
            icon={<Disc3 className="w-5 h-5" />}
            delay={0.24}
          />
          <StatsCard
            title="Tracks"
            value={stats?.tracks || 0}
            icon={<Music className="w-5 h-5" />}
            delay={0.26}
          />
          <StatsCard
            title="Users"
            value={stats?.users || 0}
            icon={<Users className="w-5 h-5" />}
            delay={0.28}
          />
          <StatsCard
            title="Radio Moods"
            value={stats?.moodDistribution?.length || 0}
            icon={<Radio className="w-5 h-5" />}
            delay={0.3}
          />
        </div>

        {/* User Engagement Metrics */}
        <UserEngagementMetrics />

        {/* Track Analytics Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h2 className="font-display text-xl font-bold">Track Analytics</h2>
          </div>
          <TrackAnalytics />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Release Types */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="glass-panel p-6 rounded-xl"
          >
            <h2 className="font-display text-lg font-semibold mb-4">
              Release Types
            </h2>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.releaseTypes || []} layout="vertical">
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={60} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Radio Mood Distribution */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34 }}
            className="glass-panel p-6 rounded-xl lg:col-span-2"
          >
            <div className="flex items-center gap-3 mb-4">
              <Radio className="w-5 h-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">
                Radio Mood Distribution
              </h2>
            </div>
            <div className="h-[200px]">
              {stats?.moodDistribution?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.moodDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.moodDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => [`${value} tracks`, "Count"]}
                    />
                    <Legend
                      layout="vertical"
                      align="right"
                      verticalAlign="middle"
                      formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No mood data available
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Live Activity Feed & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <LiveActivityFeed />
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel p-6 rounded-xl lg:col-span-2"
          >
            <h2 className="font-display text-lg font-semibold mb-4">
              Activity (Last 30 Days)
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPlays" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                    fillOpacity={1}
                    fill="url(#colorPlays)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Geographic Distribution */}
        <GeoDistributionMap />

        {/* Leaderboards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Releases Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass-panel p-6 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <h2 className="font-display text-lg font-semibold">
                Top Releases
              </h2>
            </div>
            <Tabs defaultValue="plays" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="plays" className="gap-2">
                  <PlayCircle className="w-4 h-4" />
                  Most Played
                </TabsTrigger>
                <TabsTrigger value="donations" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  Top Earning
                </TabsTrigger>
              </TabsList>
              <TabsContent value="plays" className="space-y-3">
                {topReleases?.topByPlays?.length ? (
                  topReleases.topByPlays.map((release, index) => (
                    <div
                      key={release.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-yellow-500 text-yellow-950" :
                        index === 1 ? "bg-slate-300 text-slate-800" :
                        index === 2 ? "bg-amber-600 text-amber-100" :
                        "bg-muted-foreground/20 text-muted-foreground"
                      }`}>
                        {index === 0 ? <Crown className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {release.coverArt ? (
                          <img 
                            src={release.coverArt} 
                            alt={release.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Disc3 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{release.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{release.artist}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{release.plays.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">plays</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No play data yet
                  </p>
                )}
              </TabsContent>
              <TabsContent value="donations" className="space-y-3">
                {topReleases?.topByDonations?.filter(r => r.donations > 0).length ? (
                  topReleases.topByDonations.filter(r => r.donations > 0).map((release, index) => (
                    <div
                      key={release.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-yellow-500 text-yellow-950" :
                        index === 1 ? "bg-slate-300 text-slate-800" :
                        index === 2 ? "bg-amber-600 text-amber-100" :
                        "bg-muted-foreground/20 text-muted-foreground"
                      }`}>
                        {index === 0 ? <Crown className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                        {release.coverArt ? (
                          <img 
                            src={release.coverArt} 
                            alt={release.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Disc3 className="w-6 h-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{release.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{release.artist}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-500">${(release.donations / 100).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">earned</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No donation data yet
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Top Artists Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            className="glass-panel p-6 rounded-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-5 h-5 text-purple-500" />
              <h2 className="font-display text-lg font-semibold">
                Top Artists
              </h2>
            </div>
            <Tabs defaultValue="plays" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="plays" className="gap-2">
                  <PlayCircle className="w-4 h-4" />
                  Most Played
                </TabsTrigger>
                <TabsTrigger value="earnings" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  Top Earning
                </TabsTrigger>
              </TabsList>
              <TabsContent value="plays" className="space-y-3">
                {topArtists?.topByPlays?.filter(a => a.plays > 0).length ? (
                  topArtists.topByPlays.filter(a => a.plays > 0).map((artist, index) => (
                    <div
                      key={artist.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-yellow-500 text-yellow-950" :
                        index === 1 ? "bg-slate-300 text-slate-800" :
                        index === 2 ? "bg-amber-600 text-amber-100" :
                        "bg-muted-foreground/20 text-muted-foreground"
                      }`}>
                        {index === 0 ? <Crown className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {artist.imageUrl ? (
                          <img 
                            src={artist.imageUrl} 
                            alt={artist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                            <Mic2 className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{artist.name}</p>
                        <p className="text-xs text-muted-foreground">{artist.releases} release{artist.releases !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{artist.plays.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">plays</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No play data yet
                  </p>
                )}
              </TabsContent>
              <TabsContent value="earnings" className="space-y-3">
                {topArtists?.topByEarnings?.filter(a => a.earnings > 0).length ? (
                  topArtists.topByEarnings.filter(a => a.earnings > 0).map((artist, index) => (
                    <div
                      key={artist.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? "bg-yellow-500 text-yellow-950" :
                        index === 1 ? "bg-slate-300 text-slate-800" :
                        index === 2 ? "bg-amber-600 text-amber-100" :
                        "bg-muted-foreground/20 text-muted-foreground"
                      }`}>
                        {index === 0 ? <Crown className="w-4 h-4" /> : index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {artist.imageUrl ? (
                          <img 
                            src={artist.imageUrl} 
                            alt={artist.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-500">
                            <Mic2 className="w-6 h-6 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{artist.name}</p>
                        <p className="text-xs text-muted-foreground">{artist.releases} release{artist.releases !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-500">${(artist.earnings / 100).toFixed(0)}</p>
                        <p className="text-xs text-muted-foreground">earned</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No earnings data yet
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Donations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-panel p-6 rounded-xl"
          >
            <h2 className="font-display text-lg font-semibold mb-4">
              Recent Donations
            </h2>
            <div className="space-y-4">
              {recentDonations?.length ? (
                recentDonations.map((donation) => (
                  <div
                    key={donation.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {(donation.release as any)?.title || "Unknown Release"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(donation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        ${(donation.amount_cents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {donation.status}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No donations yet
                </p>
              )}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-panel p-6 rounded-xl"
          >
            <h2 className="font-display text-lg font-semibold mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <a
                href="/admin/releases"
                className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
              >
                <Disc3 className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Manage Releases</p>
              </a>
              <a
                href="/admin/tracks"
                className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
              >
                <Music className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Manage Tracks</p>
              </a>
              <a
                href="/admin/donations"
                className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
              >
                <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">View Donations</p>
              </a>
              <a
                href="/admin/users"
                className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
              >
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">Manage Users</p>
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  );
}
