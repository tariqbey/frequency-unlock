import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Clock, Music2, UserCheck, TrendingUp, Users, Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface EngagementData {
  avgSessionDuration: number;
  tracksPerSession: number;
  retentionRate: number;
  activeUsers: number;
  returningUsers: number;
  totalSessions: number;
  weeklyTrend: { day: string; sessions: number; users: number }[];
}

export function UserEngagementMetrics() {
  const { data: engagement, isLoading } = useQuery({
    queryKey: ["admin-user-engagement"],
    queryFn: async (): Promise<EngagementData> => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // Get all play events with user_id to calculate sessions
      const { data: playEvents } = await supabase
        .from("events")
        .select("user_id, created_at, event_type")
        .in("event_type", ["play_start", "play_complete"])
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });

      // Get previous period play events for retention calculation
      const { data: prevPlayEvents } = await supabase
        .from("events")
        .select("user_id")
        .in("event_type", ["play_start", "play_complete"])
        .gte("created_at", sixtyDaysAgo.toISOString())
        .lt("created_at", thirtyDaysAgo.toISOString());

      // Calculate sessions (group plays within 30-minute windows)
      const SESSION_GAP_MS = 30 * 60 * 1000; // 30 minutes
      const userSessions: Record<string, { start: Date; end: Date; tracks: number }[]> = {};

      const validPlayEvents = (playEvents || []).filter(e => e.user_id);
      
      validPlayEvents.forEach(event => {
        if (!event.user_id) return;
        
        const userId = event.user_id;
        const eventTime = new Date(event.created_at);
        
        if (!userSessions[userId]) {
          userSessions[userId] = [];
        }
        
        const sessions = userSessions[userId];
        const lastSession = sessions[sessions.length - 1];
        
        if (lastSession && eventTime.getTime() - lastSession.end.getTime() < SESSION_GAP_MS) {
          // Extend existing session
          lastSession.end = eventTime;
          if (event.event_type === "play_start") {
            lastSession.tracks++;
          }
        } else {
          // Start new session
          sessions.push({
            start: eventTime,
            end: eventTime,
            tracks: event.event_type === "play_start" ? 1 : 0,
          });
        }
      });

      // Calculate metrics
      let totalDuration = 0;
      let totalTracks = 0;
      let totalSessions = 0;

      Object.values(userSessions).forEach(sessions => {
        sessions.forEach(session => {
          const duration = (session.end.getTime() - session.start.getTime()) / 1000 / 60; // minutes
          totalDuration += Math.max(duration, 2); // Minimum 2 minutes per session
          totalTracks += session.tracks;
          totalSessions++;
        });
      });

      const avgSessionDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
      const tracksPerSession = totalSessions > 0 ? totalTracks / totalSessions : 0;

      // Calculate retention rate (users who played in both periods)
      const currentUsers = new Set(validPlayEvents.map(e => e.user_id).filter(Boolean));
      const prevUsers = new Set((prevPlayEvents || []).map(e => e.user_id).filter(Boolean));
      
      const returningUsers = [...currentUsers].filter(u => prevUsers.has(u)).length;
      const retentionRate = prevUsers.size > 0 ? (returningUsers / prevUsers.size) * 100 : 0;

      // Weekly trend data
      const weeklyTrend: { day: string; sessions: number; users: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.setHours(0, 0, 0, 0));
        const dayEnd = new Date(date.setHours(23, 59, 59, 999));
        
        const dayEvents = validPlayEvents.filter(e => {
          const eventDate = new Date(e.created_at);
          return eventDate >= dayStart && eventDate <= dayEnd;
        });
        
        const dayUsers = new Set(dayEvents.map(e => e.user_id).filter(Boolean));
        
        weeklyTrend.push({
          day: date.toLocaleDateString("en-US", { weekday: "short" }),
          sessions: dayEvents.filter(e => e.event_type === "play_start").length,
          users: dayUsers.size,
        });
      }

      return {
        avgSessionDuration: Math.round(avgSessionDuration * 10) / 10,
        tracksPerSession: Math.round(tracksPerSession * 10) / 10,
        retentionRate: Math.round(retentionRate),
        activeUsers: currentUsers.size,
        returningUsers,
        totalSessions,
        weeklyTrend,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const metrics = [
    {
      label: "Avg Session Duration",
      value: `${engagement?.avgSessionDuration || 0} min`,
      icon: Clock,
      color: "from-violet-500 to-purple-600",
      description: "Average time users spend per session",
    },
    {
      label: "Tracks per Session",
      value: engagement?.tracksPerSession?.toFixed(1) || "0",
      icon: Music2,
      color: "from-blue-500 to-cyan-500",
      description: "Average tracks played per session",
    },
    {
      label: "Retention Rate",
      value: `${engagement?.retentionRate || 0}%`,
      icon: UserCheck,
      color: "from-emerald-500 to-teal-500",
      description: "Users returning from last 30 days",
    },
    {
      label: "Active Users",
      value: engagement?.activeUsers || 0,
      icon: Users,
      color: "from-orange-500 to-amber-500",
      description: "Unique users in last 30 days",
    },
    {
      label: "Returning Users",
      value: engagement?.returningUsers || 0,
      icon: TrendingUp,
      color: "from-pink-500 to-rose-500",
      description: "Users active in both periods",
    },
    {
      label: "Total Sessions",
      value: engagement?.totalSessions || 0,
      icon: Activity,
      color: "from-indigo-500 to-violet-500",
      description: "Total sessions in last 30 days",
    },
  ];

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel p-6 rounded-xl"
      >
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded" />
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 rounded-xl space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">User Engagement</h2>
          <p className="text-sm text-muted-foreground">
            Session and retention metrics (last 30 days)
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative overflow-hidden rounded-lg border border-border/50 bg-card/50 p-4 hover:bg-card/80 transition-colors group"
          >
            <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${metric.color}`} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-md bg-gradient-to-br ${metric.color}`}>
                  <metric.icon className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight">
                {metric.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {metric.label}
              </div>
            </div>
            
            {/* Tooltip on hover */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/95 rounded-lg p-3">
              <p className="text-xs text-center text-muted-foreground">
                {metric.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Weekly Trend Chart */}
      <div className="pt-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">
          Weekly Activity Trend
        </h3>
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={engagement?.weeklyTrend || []}>
              <defs>
                <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="usersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="day"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#sessionsGradient)"
                name="Sessions"
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--accent))"
                strokeWidth={2}
                fill="url(#usersGradient)"
                name="Active Users"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground">Sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent" />
            <span className="text-xs text-muted-foreground">Active Users</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
