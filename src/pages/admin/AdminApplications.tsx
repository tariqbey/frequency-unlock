import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, X, Clock, ExternalLink, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";

export default function AdminApplications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["admin-artist-applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const app = applications?.find((a) => a.id === applicationId);
      if (!app) throw new Error("Application not found");

      // Create artist record
      const { data: artist, error: artistError } = await supabase
        .from("artists")
        .insert({ name: app.artist_name, bio: app.bio })
        .select()
        .single();

      if (artistError) throw artistError;

      // Update profile with artist_id and add artist role
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ artist_id: artist.id })
        .eq("user_id", app.user_id);

      if (profileError) throw profileError;

      // Add artist role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: app.user_id, role: "artist" });

      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      // Update application status
      const { error: appError } = await supabase
        .from("artist_applications")
        .update({
          status: "approved",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (appError) throw appError;
    },
    onSuccess: () => {
      toast.success("Artist approved successfully!");
      queryClient.invalidateQueries({ queryKey: ["admin-artist-applications"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to approve application");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ applicationId, reason }: { applicationId: string; reason: string }) => {
      const { error } = await supabase
        .from("artist_applications")
        .update({
          status: "rejected",
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Application rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-artist-applications"] });
      setRejectDialogOpen(false);
      setRejectReason("");
      setSelectedApp(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject application");
    },
  });

  const pendingApps = applications?.filter((a) => a.status === "pending") || [];
  const approvedApps = applications?.filter((a) => a.status === "approved") || [];
  const rejectedApps = applications?.filter((a) => a.status === "rejected") || [];

  const ApplicationCard = ({ app }: { app: any }) => (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{app.artist_name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(app.created_at), "MMM d, yyyy")}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{app.bio}</p>
            {app.portfolio_url && (
              <a
                href={app.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Portfolio
              </a>
            )}
            {app.sample_tracks_urls && app.sample_tracks_urls.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Sample tracks:</p>
                <div className="flex flex-wrap gap-2">
                  {app.sample_tracks_urls.slice(0, 3).map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      Link {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
          {app.status === "pending" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/50 hover:bg-destructive/10"
                onClick={() => {
                  setSelectedApp(app);
                  setRejectDialogOpen(true);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(app.id)}
                disabled={approveMutation.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                Approve
              </Button>
            </div>
          )}
          {app.status !== "pending" && (
            <Badge
              variant={app.status === "approved" ? "default" : "destructive"}
            >
              {app.status}
            </Badge>
          )}
        </div>
        {app.rejection_reason && (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
            <p className="text-sm text-destructive">{app.rejection_reason}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Artist Applications</h1>
          <p className="mt-1 text-muted-foreground">
            Review and manage artist signup requests
          </p>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="w-4 h-4" />
              Pending ({pendingApps.length})
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-2">
              <Check className="w-4 h-4" />
              Approved ({approvedApps.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-2">
              <X className="w-4 h-4" />
              Rejected ({rejectedApps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-6 space-y-4">
            {pendingApps.length === 0 ? (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="py-12 text-center text-muted-foreground">
                  No pending applications
                </CardContent>
              </Card>
            ) : (
              pendingApps.map((app) => <ApplicationCard key={app.id} app={app} />)
            )}
          </TabsContent>

          <TabsContent value="approved" className="mt-6 space-y-4">
            {approvedApps.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </TabsContent>

          <TabsContent value="rejected" className="mt-6 space-y-4">
            {rejectedApps.map((app) => (
              <ApplicationCard key={app.id} app={app} />
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this application (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Please provide more sample tracks..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedApp &&
                rejectMutation.mutate({
                  applicationId: selectedApp.id,
                  reason: rejectReason,
                })
              }
              disabled={rejectMutation.isPending}
            >
              Reject Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
