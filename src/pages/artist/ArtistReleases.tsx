import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArtistLayout } from "@/components/artist/ArtistLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/admin/FileUpload";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Disc3, Loader2, Search } from "lucide-react";

interface Release {
  id: string;
  title: string;
  type: string;
  description: string | null;
  cover_art_url: string | null;
  is_published: boolean;
  suggested_price_cents: number | null;
  streaming_requires_donation: boolean;
  created_at: string;
}

interface ReleaseForm {
  title: string;
  type: "album" | "single" | "ep";
  description: string;
  cover_art_url: string;
  is_published: boolean;
  suggested_price_cents: number;
  streaming_requires_donation: boolean;
}

const initialForm: ReleaseForm = {
  title: "",
  type: "album",
  description: "",
  cover_art_url: "",
  is_published: false,
  suggested_price_cents: 0,
  streaming_requires_donation: false,
};

export default function ArtistReleases() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReleaseForm>(initialForm);

  // Fetch artist's releases
  const { data: releases, isLoading } = useQuery({
    queryKey: ["artist-releases", profile?.artist_id],
    queryFn: async () => {
      if (!profile?.artist_id) return [];
      const { data, error } = await supabase
        .from("releases")
        .select("*")
        .eq("artist_id", profile.artist_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Release[];
    },
    enabled: !!profile?.artist_id,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ReleaseForm) => {
      if (!profile?.artist_id) throw new Error("No artist profile linked");
      
      if (editingId) {
        const { error } = await supabase
          .from("releases")
          .update({
            title: data.title,
            type: data.type,
            description: data.description || null,
            cover_art_url: data.cover_art_url || null,
            is_published: data.is_published,
            suggested_price_cents: data.suggested_price_cents || null,
            streaming_requires_donation: data.streaming_requires_donation,
            published_at: data.is_published ? new Date().toISOString() : null,
          })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("releases").insert({
          title: data.title,
          type: data.type,
          description: data.description || null,
          cover_art_url: data.cover_art_url || null,
          artist_id: profile.artist_id,
          is_published: data.is_published,
          suggested_price_cents: data.suggested_price_cents || null,
          streaming_requires_donation: data.streaming_requires_donation,
          published_at: data.is_published ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist-releases"] });
      toast.success(editingId ? "Release updated" : "Release created");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("releases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["artist-releases"] });
      toast.success("Release deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (release: Release) => {
    setEditingId(release.id);
    setForm({
      title: release.title,
      type: release.type as "album" | "single" | "ep",
      description: release.description || "",
      cover_art_url: release.cover_art_url || "",
      is_published: release.is_published,
      suggested_price_cents: release.suggested_price_cents || 0,
      streaming_requires_donation: release.streaming_requires_donation,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error("Title is required");
      return;
    }
    saveMutation.mutate(form);
  };

  const filteredReleases = releases?.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  if (!profile?.artist_id) {
    return (
      <ArtistLayout>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Disc3 className="w-16 h-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Artist Profile Linked</h1>
          <p className="text-muted-foreground">
            Please contact an administrator to set up your artist profile.
          </p>
        </div>
      </ArtistLayout>
    );
  }

  return (
    <ArtistLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Releases</h1>
            <p className="mt-1 text-muted-foreground">
              Manage your albums, singles, and EPs
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm(initialForm)}>
                <Plus className="w-4 h-4 mr-2" />
                New Release
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Release" : "New Release"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Release title"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={form.type}
                    onValueChange={(value: "album" | "single" | "ep") =>
                      setForm({ ...form, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="album">Album</SelectItem>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="ep">EP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Tell listeners about this release..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Cover Art</Label>
                  <FileUpload
                    bucket="artwork"
                    currentUrl={form.cover_art_url}
                    onUpload={(url) => setForm({ ...form, cover_art_url: url })}
                    onRemove={() => setForm({ ...form, cover_art_url: "" })}
                    maxSizeMB={5}
                  />
                </div>

                <div>
                  <Label htmlFor="suggested_price">Suggested Price ($)</Label>
                  <Input
                    id="suggested_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.suggested_price_cents / 100}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        suggested_price_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_published">Publish immediately</Label>
                  <Switch
                    id="is_published"
                    checked={form.is_published}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, is_published: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="streaming_requires_donation">
                    Require donation to stream
                  </Label>
                  <Switch
                    id="streaming_requires_donation"
                    checked={form.streaming_requires_donation}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, streaming_requires_donation: checked })
                    }
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseDialog}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={saveMutation.isPending}
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : editingId ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search releases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-xl overflow-hidden"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Release</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReleases?.map((release) => (
                  <TableRow key={release.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {release.cover_art_url ? (
                          <img
                            src={release.cover_art_url}
                            alt={release.title}
                            className="w-10 h-10 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Disc3 className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium">{release.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{release.type}</TableCell>
                    <TableCell>
                      {release.suggested_price_cents
                        ? `$${(release.suggested_price_cents / 100).toFixed(2)}`
                        : "Free"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          release.is_published
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {release.is_published ? "Published" : "Draft"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(release)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this release? This will also delete all tracks.")) {
                              deleteMutation.mutate(release.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredReleases?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No releases found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>
    </ArtistLayout>
  );
}
