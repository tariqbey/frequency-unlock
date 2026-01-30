import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";
import { User, Music, Download, DollarSign, Calendar, Disc, ArrowLeft, Heart, MessageSquare } from "lucide-react";

interface DonationWithRelease {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  release_id: string;
  releases: {
    id: string;
    title: string;
    cover_art_url: string | null;
    artists: {
      name: string;
    } | null;
  } | null;
  download_tokens: {
    id: string;
    token: string;
    expires_at: string;
    downloads_used: number;
    max_downloads: number;
  }[];
}

export default function UserProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { favoriteTrackIds, favoriteReleaseIds } = useFavorites();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
  const [coverUrl, setCoverUrl] = useState<string | null>(profile?.cover_url || null);

  const { data: donations, isLoading: donationsLoading } = useQuery({
    queryKey: ["user-donations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("donations")
        .select(`
          *,
          releases (
            id,
            title,
            cover_art_url,
            artists (name)
          ),
          download_tokens (
            id,
            token,
            expires_at,
            downloads_used,
            max_downloads
          )
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DonationWithRelease[];
    },
    enabled: !!user?.id,
  });

  // Fetch favorite tracks with details
  const { data: favoriteTracks } = useQuery({
    queryKey: ["favorite-tracks-details", Array.from(favoriteTrackIds)],
    queryFn: async () => {
      if (favoriteTrackIds.size === 0) return [];
      
      const { data, error } = await supabase
        .from("tracks")
        .select(`
          id,
          title,
          duration_seconds,
          releases (
            id,
            title,
            cover_art_url,
            artists (name)
          )
        `)
        .in("id", Array.from(favoriteTrackIds));

      if (error) throw error;
      return data;
    },
    enabled: favoriteTrackIds.size > 0,
  });

  // Fetch favorite releases with details
  const { data: favoriteReleases } = useQuery({
    queryKey: ["favorite-releases-details", Array.from(favoriteReleaseIds)],
    queryFn: async () => {
      if (favoriteReleaseIds.size === 0) return [];
      
      const { data, error } = await supabase
        .from("releases")
        .select(`
          id,
          title,
          cover_art_url,
          artists (name)
        `)
        .in("id", Array.from(favoriteReleaseIds));

      if (error) throw error;
      return data;
    },
    enabled: favoriteReleaseIds.size > 0,
  });

  // Fetch recent forum activity
  const { data: recentThreads } = useQuery({
    queryKey: ["user-threads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select(`
          id,
          title,
          created_at,
          forums (title)
        `)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "failed":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatCurrency = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return "-:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate("/auth");
    return null;
  }

  const paidDonations = donations?.filter((d) => d.status === "paid") || [];
  const totalSpent = paidDonations.reduce((sum, d) => sum + d.amount_cents, 0);
  const uniqueReleases = new Set(paidDonations.map((d) => d.release_id)).size;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          {/* Back Button */}
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="absolute top-24 left-4 z-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>

          {/* Cover Photo */}
          {user && (
            <ProfileImageUpload
              userId={user.id}
              currentUrl={coverUrl || profile?.cover_url}
              type="cover"
              onUploadComplete={(url) => {
                setCoverUrl(url);
                refreshProfile();
              }}
            />
          )}

          {/* Profile Header with Avatar */}
          <div className="relative -mt-16 px-4 md:px-8">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              {user && (
                <ProfileImageUpload
                  userId={user.id}
                  currentUrl={avatarUrl || profile?.avatar_url}
                  type="avatar"
                  onUploadComplete={(url) => {
                    setAvatarUrl(url);
                    refreshProfile();
                  }}
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold">{profile?.display_name || "Your Profile"}</h1>
                <p className="text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted-foreground">Display Name</label>
                  <p className="font-medium">{profile?.display_name || "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Email</label>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Member Since</label>
                  <p className="font-medium">
                    {profile?.created_at
                      ? format(new Date(profile.created_at), "MMMM d, yyyy")
                      : "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Account Status</label>
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    {profile?.status || "Active"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatCurrency(totalSpent, "usd")}</p>
                    <p className="text-sm text-muted-foreground">Total Supported</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Disc className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{uniqueReleases}</p>
                    <p className="text-sm text-muted-foreground">Releases Owned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{favoriteTrackIds.size}</p>
                    <p className="text-sm text-muted-foreground">Favorite Tracks</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Download className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{paidDonations.length}</p>
                    <p className="text-sm text-muted-foreground">Total Donations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for different sections */}
          <Tabs defaultValue="favorites" className="space-y-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="favorites">Favorites</TabsTrigger>
              <TabsTrigger value="donations">Donations</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            {/* Favorites Tab */}
            <TabsContent value="favorites" className="space-y-6">
              {/* Favorite Tracks */}
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Favorite Tracks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {favoriteTracks && favoriteTracks.length > 0 ? (
                    <div className="space-y-2">
                      {favoriteTracks.map((track: any) => (
                        <div
                          key={track.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/release/${track.releases?.id}`)}
                        >
                          {track.releases?.cover_art_url ? (
                            <img
                              src={track.releases.cover_art_url}
                              alt={track.title}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <Music className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{track.title}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {track.releases?.artists?.name} • {track.releases?.title}
                            </p>
                          </div>
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatDuration(track.duration_seconds)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No favorite tracks yet</p>
                      <p className="text-sm mt-1">Click the heart icon on tracks to add them here</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Favorite Albums */}
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Disc className="w-5 h-5" />
                    Favorite Albums
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {favoriteReleases && favoriteReleases.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {favoriteReleases.map((release: any) => (
                        <div
                          key={release.id}
                          className="group cursor-pointer"
                          onClick={() => navigate(`/release/${release.id}`)}
                        >
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-2">
                            {release.cover_art_url ? (
                              <img
                                src={release.cover_art_url}
                                alt={release.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Disc className="w-12 h-12 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <p className="font-medium text-sm truncate">{release.title}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {release.artists?.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Disc className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No favorite albums yet</p>
                      <p className="text-sm mt-1">Heart albums to save them here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Donations Tab */}
            <TabsContent value="donations">
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Donation History & Downloads
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {donationsLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : donations && donations.length > 0 ? (
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Release</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Downloads</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {donations.map((donation) => {
                            const downloadToken = donation.download_tokens?.[0];
                            return (
                              <TableRow
                                key={donation.id}
                                className="cursor-pointer hover:bg-muted/30"
                                onClick={() => donation.releases && navigate(`/release/${donation.releases.id}`)}
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    {donation.releases?.cover_art_url ? (
                                      <img
                                        src={donation.releases.cover_art_url}
                                        alt={donation.releases.title}
                                        className="w-10 h-10 rounded object-cover"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                        <Disc className="w-5 h-5 text-muted-foreground" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium">
                                        {donation.releases?.title || "Unknown Release"}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {donation.releases?.artists?.name || "Unknown Artist"}
                                      </p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {formatCurrency(donation.amount_cents, donation.currency)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={getStatusColor(donation.status)}>
                                    {donation.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {format(new Date(donation.created_at), "MMM d, yyyy")}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {downloadToken ? (
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">
                                        {downloadToken.downloads_used} / {downloadToken.max_downloads}
                                      </span>
                                      {new Date(downloadToken.expires_at) < new Date() && (
                                        <Badge variant="outline" className="ml-2 text-xs bg-destructive/10 text-destructive">
                                          Expired
                                        </Badge>
                                      )}
                                    </div>
                                  ) : donation.status === "paid" ? (
                                    <span className="text-sm text-muted-foreground">Processing...</span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No donations yet</p>
                      <p className="text-sm mt-1">
                        Support artists by donating to their releases
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate("/library")}
                      >
                        Browse Library
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity">
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Forum Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentThreads && recentThreads.length > 0 ? (
                    <div className="space-y-3">
                      {recentThreads.map((thread: any) => (
                        <div
                          key={thread.id}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/forum/thread/${thread.id}`)}
                        >
                          <div>
                            <p className="font-medium">{thread.title}</p>
                            <p className="text-sm text-muted-foreground">
                              in {thread.forums?.title} • {format(new Date(thread.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No forum activity yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => navigate("/forum")}
                      >
                        Visit Forum
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}
