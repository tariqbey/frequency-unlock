import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/admin/FileUpload";
import { ArtistAlbumUploader } from "@/components/admin/ArtistAlbumUploader";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, User, Loader2, Search, Disc3, Star } from "lucide-react";
import { format } from "date-fns";

interface Artist {
  id: string;
  name: string;
  bio: string | null;
  image_url: string | null;
  is_featured: boolean;
  created_at: string;
  releases_count?: number;
}

interface ArtistForm {
  name: string;
  bio: string;
  image_url: string;
  is_featured: boolean;
}

const initialForm: ArtistForm = {
  name: "",
  bio: "",
  image_url: "",
  is_featured: false,
};

export default function AdminArtists() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ArtistForm>(initialForm);

  // Fetch artists with release count
  const { data: artists, isLoading } = useQuery({
    queryKey: ["admin-artists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artists")
        .select(`
          id,
          name,
          bio,
          image_url,
          is_featured,
          created_at,
          releases:releases(id)
        `)
        .order("name");

      if (error) throw error;
      return data.map((artist) => ({
        ...artist,
        releases_count: (artist.releases as any[])?.length || 0,
      })) as Artist[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ArtistForm) => {
      if (editingId) {
        const { error } = await supabase
          .from("artists")
          .update({
            name: data.name,
            bio: data.bio || null,
            image_url: data.image_url || null,
            is_featured: data.is_featured,
          })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("artists").insert({
          name: data.name,
          bio: data.bio || null,
          image_url: data.image_url || null,
          is_featured: data.is_featured,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-artists"] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      toast.success(editingId ? "Artist updated" : "Artist created");
      handleCloseDialog();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("artists").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-artists"] });
      queryClient.invalidateQueries({ queryKey: ["artists"] });
      toast.success("Artist deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleEdit = (artist: Artist) => {
    setEditingId(artist.id);
    setForm({
      name: artist.name,
      bio: artist.bio || "",
      image_url: artist.image_url || "",
      is_featured: artist.is_featured,
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
    if (!form.name.trim()) {
      toast.error("Artist name is required");
      return;
    }
    saveMutation.mutate(form);
  };

  const filteredArtists = artists?.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Artists</h1>
            <p className="mt-1 text-muted-foreground">
              Manage artist profiles and bios
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm(initialForm)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Artist
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Edit Artist" : "Add Artist"}
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Artist Details</TabsTrigger>
                  <TabsTrigger value="albums" disabled={!editingId && !form.name}>
                    Albums & Releases
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Artist name"
                      />
                    </div>

                    <div>
                      <Label>Profile Image</Label>
                      <FileUpload
                        bucket="artwork"
                        currentUrl={form.image_url}
                        onUpload={(url) => setForm({ ...form, image_url: url })}
                        onRemove={() => setForm({ ...form, image_url: "" })}
                        maxSizeMB={5}
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea
                        id="bio"
                        value={form.bio}
                        onChange={(e) => setForm({ ...form, bio: e.target.value })}
                        placeholder="Tell the artist's story..."
                        rows={5}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-yellow-500" />
                        <div>
                          <Label htmlFor="is_featured" className="cursor-pointer">Featured Artist</Label>
                          <p className="text-xs text-muted-foreground">Show in homepage carousel</p>
                        </div>
                      </div>
                      <Switch
                        id="is_featured"
                        checked={form.is_featured}
                        onCheckedChange={(checked) => setForm({ ...form, is_featured: checked })}
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
                </TabsContent>

                <TabsContent value="albums" className="mt-4">
                  {editingId ? (
                    <ArtistAlbumUploader
                      artistId={editingId}
                      artistName={form.name}
                      disabled={saveMutation.isPending}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Disc3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Save the artist first to add albums</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artists..."
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
                  <TableHead>Artist</TableHead>
                  <TableHead>Featured</TableHead>
                  <TableHead>Bio</TableHead>
                  <TableHead>Releases</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArtists?.map((artist) => (
                  <TableRow key={artist.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {artist.image_url ? (
                          <img
                            src={artist.image_url}
                            alt={artist.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{artist.name}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {artist.is_featured ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-600">
                          <Star className="w-3 h-3" />
                          Featured
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {artist.bio ? (
                        <span className="text-sm text-muted-foreground line-clamp-2 max-w-xs">
                          {artist.bio}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">
                          No bio
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Disc3 className="w-4 h-4 text-muted-foreground" />
                        <span>{artist.releases_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(artist.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(artist)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (artist.releases_count && artist.releases_count > 0) {
                              toast.error("Cannot delete artist with releases");
                              return;
                            }
                            if (confirm("Delete this artist?")) {
                              deleteMutation.mutate(artist.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!filteredArtists?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No artists found
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
