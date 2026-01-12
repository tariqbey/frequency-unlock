import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Download,
  Disc,
  Music,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface DownloadableRelease {
  donation_id: string;
  token: string;
  expires_at: string;
  downloads_used: number;
  max_downloads: number;
  release: {
    id: string;
    title: string;
    cover_art_url: string | null;
    artist_name: string;
    tracks: {
      id: string;
      title: string;
      track_number: number;
      duration_seconds: number | null;
    }[];
  };
}

export default function Downloads() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [downloadingTrack, setDownloadingTrack] = useState<string | null>(null);

  const { data: downloadableReleases, isLoading } = useQuery({
    queryKey: ["downloadable-releases", user?.id],
    queryFn: async () => {
      // Get paid donations with valid download tokens
      const { data: tokens, error } = await supabase
        .from("download_tokens")
        .select(`
          id,
          token,
          expires_at,
          downloads_used,
          max_downloads,
          donations!inner (
            id,
            user_id,
            status,
            releases!inner (
              id,
              title,
              cover_art_url,
              artists!inner (name)
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Now fetch tracks for each release
      const releaseIds = [...new Set(tokens?.map(t => t.donations.releases.id) || [])];
      
      const { data: tracks, error: tracksError } = await supabase
        .from("tracks")
        .select("id, title, track_number, duration_seconds, release_id")
        .in("release_id", releaseIds)
        .order("track_number");

      if (tracksError) throw tracksError;

      // Group tracks by release
      const tracksByRelease = (tracks || []).reduce((acc, track) => {
        if (!acc[track.release_id]) acc[track.release_id] = [];
        acc[track.release_id].push(track);
        return acc;
      }, {} as Record<string, typeof tracks>);

      // Transform data
      return (tokens || []).map((token) => ({
        donation_id: token.donations.id,
        token: token.token,
        expires_at: token.expires_at,
        downloads_used: token.downloads_used,
        max_downloads: token.max_downloads,
        release: {
          id: token.donations.releases.id,
          title: token.donations.releases.title,
          cover_art_url: token.donations.releases.cover_art_url,
          artist_name: token.donations.releases.artists.name,
          tracks: tracksByRelease[token.donations.releases.id] || [],
        },
      })) as DownloadableRelease[];
    },
    enabled: !!user?.id,
  });

  const handleDownload = async (token: string, trackId: string, trackTitle: string) => {
    setDownloadingTrack(trackId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("download-release", {
        body: { download_token: token, track_id: trackId },
      });

      if (response.error) {
        throw new Error(response.error.message || "Download failed");
      }

      const { url, filename } = response.data;

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || `${trackTitle}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloading ${trackTitle}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      toast.error(message);
    } finally {
      setDownloadingTrack(null);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getTokenStatus = (release: DownloadableRelease) => {
    const isExpired = new Date(release.expires_at) < new Date();
    const isExhausted = release.downloads_used >= release.max_downloads;

    if (isExpired) return { status: "expired", color: "bg-destructive/10 text-destructive border-destructive/20" };
    if (isExhausted) return { status: "exhausted", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" };
    return { status: "active", color: "bg-green-500/10 text-green-500 border-green-500/20" };
  };

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  const activeReleases = downloadableReleases?.filter(r => {
    const isExpired = new Date(r.expires_at) < new Date();
    const isExhausted = r.downloads_used >= r.max_downloads;
    return !isExpired && !isExhausted;
  }) || [];

  const expiredReleases = downloadableReleases?.filter(r => {
    const isExpired = new Date(r.expires_at) < new Date();
    const isExhausted = r.downloads_used >= r.max_downloads;
    return isExpired || isExhausted;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Your Downloads</h1>
              <p className="text-muted-foreground">
                Access and download your purchased releases
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : downloadableReleases && downloadableReleases.length > 0 ? (
            <div className="space-y-8">
              {/* Active Downloads */}
              {activeReleases.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Available for Download
                  </h2>
                  <div className="grid gap-4">
                    {activeReleases.map((release) => (
                      <ReleaseDownloadCard
                        key={release.donation_id}
                        release={release}
                        onDownload={handleDownload}
                        downloadingTrack={downloadingTrack}
                        formatDuration={formatDuration}
                        getTokenStatus={getTokenStatus}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Expired Downloads */}
              {expiredReleases.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="w-5 h-5" />
                    Expired or Exhausted
                  </h2>
                  <div className="grid gap-4 opacity-60">
                    {expiredReleases.map((release) => (
                      <ReleaseDownloadCard
                        key={release.donation_id}
                        release={release}
                        onDownload={handleDownload}
                        downloadingTrack={downloadingTrack}
                        formatDuration={formatDuration}
                        getTokenStatus={getTokenStatus}
                        disabled
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="py-16 text-center">
                <Download className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No Downloads Available</h3>
                <p className="text-muted-foreground mb-6">
                  Support artists by donating to their releases to get download access.
                </p>
                <Button onClick={() => navigate("/library")}>Browse Library</Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}

interface ReleaseDownloadCardProps {
  release: DownloadableRelease;
  onDownload: (token: string, trackId: string, trackTitle: string) => void;
  downloadingTrack: string | null;
  formatDuration: (seconds: number | null) => string;
  getTokenStatus: (release: DownloadableRelease) => { status: string; color: string };
  disabled?: boolean;
}

function ReleaseDownloadCard({
  release,
  onDownload,
  downloadingTrack,
  formatDuration,
  getTokenStatus,
  disabled,
}: ReleaseDownloadCardProps) {
  const { status, color } = getTokenStatus(release);
  const downloadsRemaining = release.max_downloads - release.downloads_used;
  const progressPercent = (release.downloads_used / release.max_downloads) * 100;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Cover Art */}
        <div className="md:w-48 flex-shrink-0">
          {release.release.cover_art_url ? (
            <img
              src={release.release.cover_art_url}
              alt={release.release.title}
              className="w-full h-48 md:h-full object-cover"
            />
          ) : (
            <div className="w-full h-48 md:h-full bg-muted flex items-center justify-center">
              <Disc className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-xl font-bold">{release.release.title}</h3>
              <p className="text-muted-foreground">{release.release.artist_name}</p>
            </div>
            <Badge variant="outline" className={color}>
              {status === "active" ? "Active" : status === "expired" ? "Expired" : "Limit Reached"}
            </Badge>
          </div>

          {/* Download Stats */}
          <div className="flex items-center gap-6 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-muted-foreground" />
              <span>
                {downloadsRemaining} of {release.max_downloads} downloads remaining
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>
                Expires {format(new Date(release.expires_at), "MMM d, yyyy")}
              </span>
            </div>
          </div>

          <Progress value={progressPercent} className="h-2 mb-4" />

          {/* Tracks */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="tracks" className="border-none">
              <AccordionTrigger className="py-2 hover:no-underline">
                <span className="flex items-center gap-2 text-sm">
                  <Music className="w-4 h-4" />
                  {release.release.tracks.length} tracks
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {release.release.tracks.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-center text-muted-foreground text-sm">
                          {track.track_number}
                        </span>
                        <span className="font-medium">{track.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(track.duration_seconds)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={disabled || downloadingTrack === track.id}
                        onClick={() => onDownload(release.token, track.id, track.title)}
                        className="gap-2"
                      >
                        {downloadingTrack === track.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    </Card>
  );
}
