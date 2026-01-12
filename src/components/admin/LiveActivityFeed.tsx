import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Play, Download, DollarSign, Disc3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "play_start" | "play_complete" | "download" | "donation_paid" | "donation_start";
  timestamp: Date;
  metadata?: {
    trackTitle?: string;
    releaseTitle?: string;
    artistName?: string;
    amount?: number;
  };
}

const MAX_ITEMS = 10;

export function LiveActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Subscribe to events table
    const eventsChannel = supabase
      .channel("live-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "events",
        },
        async (payload) => {
          const event = payload.new as {
            id: string;
            event_type: string;
            created_at: string;
            track_id?: string;
            release_id?: string;
            metadata?: Record<string, unknown>;
          };

          // Fetch related data
          let metadata: ActivityItem["metadata"] = {};

          if (event.track_id) {
            const { data: track } = await supabase
              .from("tracks")
              .select("title, release:releases(title, artist:artists(name))")
              .eq("id", event.track_id)
              .single();

            if (track) {
              metadata.trackTitle = track.title;
              const release = track.release as { title: string; artist: { name: string } } | null;
              metadata.releaseTitle = release?.title;
              metadata.artistName = release?.artist?.name;
            }
          } else if (event.release_id) {
            const { data: release } = await supabase
              .from("releases")
              .select("title, artist:artists(name)")
              .eq("id", event.release_id)
              .single();

            if (release) {
              metadata.releaseTitle = release.title;
              const artist = release.artist as { name: string } | null;
              metadata.artistName = artist?.name;
            }
          }

          const newActivity: ActivityItem = {
            id: event.id,
            type: event.event_type as ActivityItem["type"],
            timestamp: new Date(event.created_at),
            metadata,
          };

          setActivities((prev) => [newActivity, ...prev].slice(0, MAX_ITEMS));
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    // Subscribe to donations table
    const donationsChannel = supabase
      .channel("live-donations")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "donations",
          filter: "status=eq.paid",
        },
        async (payload) => {
          const donation = payload.new as {
            id: string;
            amount_cents: number;
            release_id: string;
            created_at: string;
          };

          // Fetch release info
          const { data: release } = await supabase
            .from("releases")
            .select("title, artist:artists(name)")
            .eq("id", donation.release_id)
            .single();

          const newActivity: ActivityItem = {
            id: `donation-${donation.id}`,
            type: "donation_paid",
            timestamp: new Date(),
            metadata: {
              amount: donation.amount_cents,
              releaseTitle: release?.title,
              artistName: (release?.artist as { name: string } | null)?.name,
            },
          };

          setActivities((prev) => [newActivity, ...prev].slice(0, MAX_ITEMS));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsChannel);
      supabase.removeChannel(donationsChannel);
    };
  }, []);

  const getActivityIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "play_start":
      case "play_complete":
        return <Play className="w-4 h-4" />;
      case "download":
        return <Download className="w-4 h-4" />;
      case "donation_paid":
      case "donation_start":
        return <DollarSign className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: ActivityItem["type"]) => {
    switch (type) {
      case "play_start":
      case "play_complete":
        return "bg-blue-500/20 text-blue-400";
      case "download":
        return "bg-purple-500/20 text-purple-400";
      case "donation_paid":
      case "donation_start":
        return "bg-emerald-500/20 text-emerald-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getActivityText = (activity: ActivityItem) => {
    const { type, metadata } = activity;
    const track = metadata?.trackTitle || "a track";
    const release = metadata?.releaseTitle || "a release";
    const artist = metadata?.artistName || "Unknown Artist";

    switch (type) {
      case "play_start":
        return (
          <>
            Started playing <span className="font-medium text-foreground">{track}</span>
            {metadata?.artistName && (
              <span className="text-muted-foreground"> by {artist}</span>
            )}
          </>
        );
      case "play_complete":
        return (
          <>
            Finished <span className="font-medium text-foreground">{track}</span>
            {metadata?.artistName && (
              <span className="text-muted-foreground"> by {artist}</span>
            )}
          </>
        );
      case "download":
        return (
          <>
            Downloaded <span className="font-medium text-foreground">{release}</span>
            {metadata?.artistName && (
              <span className="text-muted-foreground"> by {artist}</span>
            )}
          </>
        );
      case "donation_paid":
        return (
          <>
            <span className="font-medium text-emerald-400">
              ${((metadata?.amount || 0) / 100).toFixed(2)}
            </span>{" "}
            donation for <span className="font-medium text-foreground">{release}</span>
          </>
        );
      default:
        return "Activity recorded";
    }
  };

  return (
    <div className="glass-panel p-6 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-semibold">Live Activity</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "Live" : "Connecting..."}
          </span>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {activities.length > 0 ? (
            activities.map((activity) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(
                    activity.type
                  )}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {getActivityText(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Disc3 className="w-6 h-6 text-muted-foreground animate-spin" style={{ animationDuration: "3s" }} />
              </div>
              <p className="text-sm text-muted-foreground">Waiting for activity...</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Plays, downloads, and donations will appear here in real-time
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
