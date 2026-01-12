import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatsCard } from "@/components/admin/StatsCard";
import { Disc3, Music, DollarSign, Users, Radio, Mic2, Sparkles, Zap, Moon, Heart, Cloud } from "lucide-react";
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
  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [releasesRes, tracksRes, donationsRes, usersRes, artistsRes, eventsRes, moodTracksRes] = await Promise.all([
        supabase.from("releases").select("id", { count: "exact", head: true }),
        supabase.from("tracks").select("id", { count: "exact", head: true }),
        supabase.from("donations").select("amount_cents").eq("status", "paid"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("artists").select("id", { count: "exact", head: true }),
        supabase
          .from("events")
          .select("created_at, event_type")
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("tracks").select("mood"),
      ]);

      const totalRevenue = donationsRes.data?.reduce((sum, d) => sum + d.amount_cents, 0) || 0;

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

      return {
        releases: releasesRes.count || 0,
        tracks: tracksRes.count || 0,
        revenue: totalRevenue,
        users: usersRes.count || 0,
        artists: artistsRes.count || 0,
        recentEvents: eventsRes.data || [],
        moodDistribution,
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <StatsCard
            title="Total Artists"
            value={stats?.artists || 0}
            icon={<Mic2 className="w-6 h-6" />}
            delay={0}
          />
          <StatsCard
            title="Total Releases"
            value={stats?.releases || 0}
            icon={<Disc3 className="w-6 h-6" />}
            delay={0.05}
          />
          <StatsCard
            title="Total Tracks"
            value={stats?.tracks || 0}
            icon={<Music className="w-6 h-6" />}
            delay={0.1}
          />
          <StatsCard
            title="Total Revenue"
            value={`$${((stats?.revenue || 0) / 100).toFixed(2)}`}
            change="All time"
            changeType="neutral"
            icon={<DollarSign className="w-6 h-6" />}
            delay={0.15}
          />
          <StatsCard
            title="Total Users"
            value={stats?.users || 0}
            icon={<Users className="w-6 h-6" />}
            delay={0.2}
          />
        </div>

        {/* Radio Mood Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-panel p-6 rounded-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <Radio className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">
              Radio Mood Distribution
            </h2>
          </div>
          <div className="h-[280px]">
            {stats?.moodDistribution?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.moodDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
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
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
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
