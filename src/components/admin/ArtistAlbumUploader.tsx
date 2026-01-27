import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  X,
  Loader2,
  Music,
  Image as ImageIcon,
  Disc3,
  ArrowUp,
  ArrowDown,
  Plus,
  Check,
  Trash2,
} from "lucide-react";

interface TrackFile {
  id: string;
  file: File;
  title: string;
  trackNumber: number;
  mood: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

interface AlbumDraft {
  id: string;
  title: string;
  type: "album" | "single" | "ep";
  description: string;
  suggestedPrice: number;
  isPublished: boolean;
  streamingRequiresDonation: boolean;
  coverFile: File | null;
  coverPreview: string | null;
  tracks: TrackFile[];
  uploading: boolean;
  uploaded: boolean;
  uploadProgress: number;
}

interface ArtistAlbumUploaderProps {
  artistId: string;
  artistName: string;
  disabled?: boolean;
}

const createEmptyAlbum = (): AlbumDraft => ({
  id: `album-${Date.now()}`,
  title: "",
  type: "album",
  description: "",
  suggestedPrice: 0,
  isPublished: false,
  streamingRequiresDonation: false,
  coverFile: null,
  coverPreview: null,
  tracks: [],
  uploading: false,
  uploaded: false,
  uploadProgress: 0,
});

export function ArtistAlbumUploader({ artistId, artistName, disabled }: ArtistAlbumUploaderProps) {
  const queryClient = useQueryClient();
  const [albums, setAlbums] = useState<AlbumDraft[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const coverInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const tracksInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const addAlbum = () => {
    setAlbums([...albums, createEmptyAlbum()]);
  };

  const removeAlbum = (albumId: string) => {
    setAlbums(albums.filter((a) => a.id !== albumId));
  };

  const updateAlbum = (albumId: string, updates: Partial<AlbumDraft>) => {
    setAlbums((prev) =>
      prev.map((a) => (a.id === albumId ? { ...a, ...updates } : a))
    );
  };

  const handleCoverSelect = (albumId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover art too large. Max size is 5MB");
      return;
    }

    updateAlbum(albumId, {
      coverFile: file,
      coverPreview: URL.createObjectURL(file),
    });
  };

  const handleTracksSelect = (albumId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const album = albums.find((a) => a.id === albumId);
    if (!album) return;

    const audioFiles = files.filter((f) =>
      ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/aac"].some(
        (type) => f.type.includes(type.split("/")[1])
      )
    );

    if (audioFiles.length === 0) {
      toast.error("No valid audio files selected");
      return;
    }

    const existingTracks = album.tracks;
    const newTracks: TrackFile[] = audioFiles.map((file, index) => {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const trackMatch = nameWithoutExt.match(/^(\d+)[\s\-._]+(.+)$/);

      return {
        id: `${Date.now()}-${index}`,
        file,
        title: trackMatch ? trackMatch[2].trim() : nameWithoutExt,
        trackNumber: trackMatch ? parseInt(trackMatch[1]) : existingTracks.length + index + 1,
        mood: "",
        uploading: false,
        uploaded: false,
      };
    });

    newTracks.sort((a, b) => a.trackNumber - b.trackNumber);
    updateAlbum(albumId, { tracks: [...existingTracks, ...newTracks] });
    toast.success(`Added ${audioFiles.length} tracks`);
  };

  const updateTrack = (albumId: string, trackId: string, updates: Partial<TrackFile>) => {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === albumId
          ? {
              ...a,
              tracks: a.tracks.map((t) =>
                t.id === trackId ? { ...t, ...updates } : t
              ),
            }
          : a
      )
    );
  };

  const removeTrack = (albumId: string, trackId: string) => {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === albumId
          ? { ...a, tracks: a.tracks.filter((t) => t.id !== trackId) }
          : a
      )
    );
  };

  const moveTrack = (albumId: string, trackId: string, direction: "up" | "down") => {
    const album = albums.find((a) => a.id === albumId);
    if (!album) return;

    const index = album.tracks.findIndex((t) => t.id === trackId);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === album.tracks.length - 1)
    ) {
      return;
    }

    const newTracks = [...album.tracks];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newTracks[index], newTracks[swapIndex]] = [newTracks[swapIndex], newTracks[index]];
    newTracks.forEach((t, i) => {
      t.trackNumber = i + 1;
    });

    updateAlbum(albumId, { tracks: newTracks });
  };

  const uploadAllAlbums = async () => {
    const validAlbums = albums.filter((a) => a.title && a.tracks.length > 0 && !a.uploaded);
    if (validAlbums.length === 0) {
      toast.error("No valid albums to upload");
      return;
    }

    setIsUploading(true);

    for (const album of validAlbums) {
      updateAlbum(album.id, { uploading: true, uploadProgress: 0 });

      try {
        let coverUrl: string | null = null;

        // Upload cover art
        if (album.coverFile) {
          const fileExt = album.coverFile.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { error: coverError } = await supabase.storage
            .from("artwork")
            .upload(fileName, album.coverFile);

          if (coverError) throw coverError;

          const { data: urlData } = supabase.storage.from("artwork").getPublicUrl(fileName);
          coverUrl = urlData.publicUrl;
        }

        updateAlbum(album.id, { uploadProgress: 10 });

        // Create release
        const { data: release, error: releaseError } = await supabase
          .from("releases")
          .insert({
            title: album.title,
            artist_id: artistId,
            type: album.type,
            description: album.description || null,
            cover_art_url: coverUrl,
            suggested_price_cents: album.suggestedPrice > 0 ? Math.round(album.suggestedPrice * 100) : null,
            is_published: album.isPublished,
            streaming_requires_donation: album.streamingRequiresDonation,
            published_at: album.isPublished ? new Date().toISOString() : null,
          })
          .select()
          .single();

        if (releaseError) throw releaseError;

        updateAlbum(album.id, { uploadProgress: 20 });

        // Upload tracks
        const totalTracks = album.tracks.length;
        for (let i = 0; i < totalTracks; i++) {
          const track = album.tracks[i];
          updateTrack(album.id, track.id, { uploading: true });

          const fileExt = track.file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { error: audioError } = await supabase.storage
            .from("audio")
            .upload(fileName, track.file);

          if (audioError) throw audioError;

          const { error: trackError } = await supabase.from("tracks").insert({
            release_id: release.id,
            title: track.title,
            track_number: track.trackNumber,
            audio_path: fileName,
            mood: track.mood || null,
            radio_enabled: true,
          });

          if (trackError) throw trackError;

          updateTrack(album.id, track.id, { uploading: false, uploaded: true });
          updateAlbum(album.id, { uploadProgress: 20 + ((i + 1) / totalTracks) * 80 });
        }

        updateAlbum(album.id, { uploading: false, uploaded: true, uploadProgress: 100 });
        toast.success(`Album "${album.title}" uploaded!`);
      } catch (error: any) {
        console.error("Upload error:", error);
        updateAlbum(album.id, { uploading: false });
        toast.error(`Failed to upload "${album.title}": ${error.message}`);
      }
    }

    queryClient.invalidateQueries({ queryKey: ["admin-artists"] });
    queryClient.invalidateQueries({ queryKey: ["admin-releases"] });
    setIsUploading(false);
  };

  const pendingAlbums = albums.filter((a) => !a.uploaded);
  const uploadedAlbums = albums.filter((a) => a.uploaded);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Albums & Releases</h3>
          <p className="text-xs text-muted-foreground">
            Add albums with tracks for {artistName}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addAlbum}
          disabled={disabled || isUploading}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Album
        </Button>
      </div>

      {albums.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
          <Disc3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No albums added yet</p>
          <p className="text-xs mt-1">Click "Add Album" to start building the discography</p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {albums.map((album) => (
            <AccordionItem
              key={album.id}
              value={album.id}
              className="border border-border rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-3 w-full">
                  {album.coverPreview ? (
                    <img
                      src={album.coverPreview}
                      alt="Cover"
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <Disc3 className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="font-medium">
                      {album.title || "Untitled Album"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {album.tracks.length} tracks • {album.type}
                      {album.uploaded && (
                        <span className="ml-2 text-green-500">✓ Uploaded</span>
                      )}
                    </p>
                  </div>
                  {album.uploading && (
                    <div className="w-24">
                      <Progress value={album.uploadProgress} className="h-2" />
                    </div>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                  {/* Album metadata */}
                  <div className="space-y-3">
                    <div>
                      <Label>Album Title *</Label>
                      <Input
                        value={album.title}
                        onChange={(e) => updateAlbum(album.id, { title: e.target.value })}
                        placeholder="Enter album title"
                        disabled={album.uploaded || album.uploading}
                      />
                    </div>

                    <div>
                      <Label>Release Type</Label>
                      <Select
                        value={album.type}
                        onValueChange={(v) => updateAlbum(album.id, { type: v as "album" | "single" | "ep" })}
                        disabled={album.uploaded || album.uploading}
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
                      <Label>Description</Label>
                      <Textarea
                        value={album.description}
                        onChange={(e) => updateAlbum(album.id, { description: e.target.value })}
                        placeholder="Album description"
                        rows={2}
                        disabled={album.uploaded || album.uploading}
                      />
                    </div>

                    <div>
                      <Label>Suggested Price ($)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={album.suggestedPrice}
                        onChange={(e) => updateAlbum(album.id, { suggestedPrice: parseFloat(e.target.value) || 0 })}
                        disabled={album.uploaded || album.uploading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Publish immediately</Label>
                      <Switch
                        checked={album.isPublished}
                        onCheckedChange={(v) => updateAlbum(album.id, { isPublished: v })}
                        disabled={album.uploaded || album.uploading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Streaming requires donation</Label>
                      <Switch
                        checked={album.streamingRequiresDonation}
                        onCheckedChange={(v) => updateAlbum(album.id, { streamingRequiresDonation: v })}
                        disabled={album.uploaded || album.uploading}
                      />
                    </div>

                    {/* Cover Art */}
                    <div>
                      <Label>Cover Art</Label>
                      <input
                        ref={(el) => (coverInputRefs.current[album.id] = el)}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleCoverSelect(album.id, e)}
                        className="hidden"
                        disabled={album.uploaded || album.uploading}
                      />
                      {album.coverPreview ? (
                        <div className="relative inline-block mt-2">
                          <img
                            src={album.coverPreview}
                            alt="Cover preview"
                            className="w-24 h-24 rounded-lg object-cover border border-border"
                          />
                          {!album.uploaded && !album.uploading && (
                            <button
                              type="button"
                              onClick={() => updateAlbum(album.id, { coverFile: null, coverPreview: null })}
                              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => coverInputRefs.current[album.id]?.click()}
                          disabled={album.uploaded || album.uploading}
                          className="mt-2 gap-2"
                        >
                          <ImageIcon className="w-4 h-4" />
                          Upload Cover
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tracks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Tracks ({album.tracks.length})</Label>
                      <input
                        ref={(el) => (tracksInputRefs.current[album.id] = el)}
                        type="file"
                        accept="audio/*"
                        multiple
                        onChange={(e) => handleTracksSelect(album.id, e)}
                        className="hidden"
                        disabled={album.uploaded || album.uploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => tracksInputRefs.current[album.id]?.click()}
                        disabled={album.uploaded || album.uploading}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Add Tracks
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {album.tracks.length === 0 ? (
                        <div className="border border-dashed border-border rounded-lg p-4 text-center text-muted-foreground">
                          <Music className="w-6 h-6 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">No tracks added</p>
                        </div>
                      ) : (
                        <AnimatePresence>
                          {album.tracks.map((track, index) => (
                            <motion.div
                              key={track.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, height: 0 }}
                              className={`border rounded-lg p-2 ${
                                track.uploaded
                                  ? "border-green-500/50 bg-green-500/5"
                                  : track.uploading
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-6 text-center">
                                  {track.trackNumber}
                                </span>
                                <Input
                                  value={track.title}
                                  onChange={(e) =>
                                    updateTrack(album.id, track.id, { title: e.target.value })
                                  }
                                  className="flex-1 h-8 text-sm"
                                  placeholder="Track title"
                                  disabled={track.uploaded || track.uploading}
                                />
                                {track.uploading ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                ) : track.uploaded ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => moveTrack(album.id, track.id, "up")}
                                      disabled={index === 0}
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => moveTrack(album.id, track.id, "down")}
                                      disabled={index === album.tracks.length - 1}
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive"
                                      onClick={() => removeTrack(album.id, track.id)}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      )}
                    </div>
                  </div>
                </div>

                {/* Album actions */}
                {!album.uploaded && (
                  <div className="flex justify-end mt-4 pt-4 border-t border-border">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeAlbum(album.id)}
                      disabled={album.uploading}
                      className="gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove Album
                    </Button>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Upload all button */}
      {pendingAlbums.length > 0 && (
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            type="button"
            onClick={uploadAllAlbums}
            disabled={isUploading || pendingAlbums.every((a) => !a.title || a.tracks.length === 0)}
            className="gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload {pendingAlbums.length} Album{pendingAlbums.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
