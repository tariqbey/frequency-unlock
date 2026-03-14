import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
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
import { AlbumUploader } from "@/components/admin/AlbumUploader";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Disc3, Loader2, Search, Upload, Star, RefreshCw } from "lucide-react";
import { BulkAudioReupload } from "@/components/admin/BulkAudioReupload";

interface Release {
  id: string;
  title: string;
  type: string;
  description: string | null;
  cover_art_url: string | null;
  is_published: boolean;
  is_featured: boolean;
  suggested_price_cents: number | null;
  streaming_requires_donation: boolean;
  created_at: string;
  artist: { id: string; name: string } | null;
}

interface ReleaseForm {
  title: string;
  type: "album" | "single" | "ep";
  description: string;
  cover_art_url: string;
  artist_id: string;
  is_published: boolean;
  is_featured: boolean;
  suggested_price_cents: number;
  streaming_requires_donation: boolean;
}

const initialForm: ReleaseForm = {
  title: "",
  type: "album",
  description: "",
  cover_art_url: "",
  artist_id: "",
  is_published: false,
  is_featured: false,
  suggested_price_cents: 0,
  streaming_requires_donation: false,
};

export default function AdminReleases() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [albumUploaderOpen, setAlbumUploaderOpen] = useState(false);
  const [reuploadRelease, setReuploadRelease] = useState<{ id: string; title: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ReleaseForm>(initialForm);
  // Fetch releases
  const { data: releases, isLoading } = useQuery({
    queryKey: ["admin-releases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("releases")
        .select(`
          id,
          title,
          type,
          description,
          cover_art_url,
          is_published,
          is_featured,
          suggested_price_cents,
          streaming_requires_donation,
          created_at,
          artist:artists(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as Release[];
    },
  });

  // Fetch artists for dropdown
  const { data: artists } = useQuery({
    queryKey: ["artists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select("id, name")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ReleaseForm) => {
      if (editingId) {
        const { error } = await supabase
          .from("releases")
          .update({
            title: data.title,
            type: data.type,
            description: data.description || null,
            cover_art_url: data.cover_art_url || null,
            artist_id: data.artist_id,
            is_published: data.is_published,
            is_featured: data.is_featured,
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
          artist_id: data.artist_id,
          is_published: data.is_published,
          is_featured: data.is_featured,
          suggested_price_cents: data.suggested_price_cents || null,
          streaming_requires_donation: data.streaming_requires_donation,
          published_at: data.is_published ? new Date().toISOString() : null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-releases"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-releases"] });
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
      artist_id: release.artist?.id || "",
      is_published: release.is_published,
      is_featured: release.is_featured,
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
    if (!form.title || !form.artist_id) {
      toast.error("Title and artist are required");
      return;
    }
    saveMutation.mutate(form);
  };

  const filteredReleases = releases?.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.artist?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Releases</h1>
            <p className="mt-1 text-muted-foreground">
              Manage albums, singles, and EPs
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAlbumUploaderOpen(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Mass Upload Album
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setForm(initialForm)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Release
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md w-[95vw] max-h-[90vh] flex flex-col">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {editingId ? "Edit Release" : "Add Release"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Release title"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="artist">Artist</Label>
                    <Select
                      value={form.artist_id}
                      onValueChange={(value) => setForm({ ...form, artist_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select artist" />
                      </SelectTrigger>
                      <SelectContent>
                        {artists?.map((artist) => (
                          <SelectItem key={artist.id} value={artist.id}>
                            {artist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Release description"
                    rows={2}
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
                  <Label htmlFor="is_published">Published</Label>
                  <Switch
                    id="is_published"
                    checked={form.is_published}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, is_published: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_featured">Featured on Homepage</Label>
                    <p className="text-xs text-muted-foreground">Show in homepage carousel</p>
                  </div>
                  <Switch
                    id="is_featured"
                    checked={form.is_featured}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, is_featured: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="streaming_requires_donation">
                    Streaming requires donation
                  </Label>
                  <Switch
                    id="streaming_requires_donation"
                    checked={form.streaming_requires_donation}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, streaming_requires_donation: checked })
                    }
                  />
                </div>

                <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-2">
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

          {/* Album Uploader Dialog */}
          <AlbumUploader open={albumUploaderOpen} onOpenChange={setAlbumUploaderOpen} />
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
                  <TableHead>Artist</TableHead>
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
                        <div className="relative">
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
                          {release.is_featured && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                              <Star className="w-2.5 h-2.5 text-primary-foreground" fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-medium">{release.title}</span>
                          {release.is_featured && (
                            <span className="ml-2 text-xs text-primary font-medium">Featured</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{release.artist?.name || "—"}</TableCell>
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
                            if (confirm("Delete this release?")) {
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No releases found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>
    </AdminLayout>
  );
}
