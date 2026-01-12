import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { 
  Disc3, Music, DollarSign, Users, Radio, Mic2, 
  PlayCircle, Download, Star, TrendingUp 
} from "lucide-react";
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
        {/* Header */}
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your music platform
          </p>
        </div>

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

        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-panel p-6 rounded-xl"
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
