import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload,
  X,
  Loader2,
  Music,
  Image as ImageIcon,
  Disc3,
  GripVertical,
  ArrowUp,
  ArrowDown,
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

interface AlbumUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AlbumUploader({ open, onOpenChange }: AlbumUploaderProps) {
  const queryClient = useQueryClient();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const tracksInputRef = useRef<HTMLInputElement>(null);

  // Album metadata
  const [title, setTitle] = useState("");
  const [artistId, setArtistId] = useState("");
  const [type, setType] = useState<"album" | "single" | "ep">("album");
  const [description, setDescription] = useState("");
  const [suggestedPrice, setSuggestedPrice] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [streamingRequiresDonation, setStreamingRequiresDonation] = useState(false);

  // Cover art
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  // Tracks
  const [tracks, setTracks] = useState<TrackFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch artists
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

  // Handle cover art selection
  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Cover art too large. Max size is 5MB");
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  // Handle track files selection
  const handleTracksSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const audioFiles = files.filter((f) =>
      ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/aac"].some(
        (type) => f.type.includes(type.split("/")[1])
      )
    );

    if (audioFiles.length === 0) {
      toast.error("No valid audio files selected");
      return;
    }

    // Parse track names from filenames
    const newTracks: TrackFile[] = audioFiles.map((file, index) => {
      // Try to extract track number and title from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const trackMatch = nameWithoutExt.match(/^(\d+)[\s\-._]+(.+)$/);

      return {
        id: `${Date.now()}-${index}`,
        file,
        title: trackMatch ? trackMatch[2].trim() : nameWithoutExt,
        trackNumber: trackMatch ? parseInt(trackMatch[1]) : tracks.length + index + 1,
        mood: "",
        uploading: false,
        uploaded: false,
      };
    });

    // Sort by track number
    newTracks.sort((a, b) => a.trackNumber - b.trackNumber);

    setTracks([...tracks, ...newTracks]);
    toast.success(`Added ${audioFiles.length} tracks`);
  };

  // Update track metadata
  const updateTrack = (id: string, updates: Partial<TrackFile>) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  };

  // Remove track
  const removeTrack = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  // Move track up/down
  const moveTrack = (id: string, direction: "up" | "down") => {
    const index = tracks.findIndex((t) => t.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === tracks.length - 1)
    ) {
      return;
    }

    const newTracks = [...tracks];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newTracks[index], newTracks[swapIndex]] = [newTracks[swapIndex], newTracks[index]];

    // Update track numbers
    newTracks.forEach((t, i) => {
      t.trackNumber = i + 1;
    });

    setTracks(newTracks);
  };

  // Upload album
  const uploadAlbum = async () => {
    if (!title || !artistId) {
      toast.error("Title and artist are required");
      return;
    }

    if (tracks.length === 0) {
      toast.error("Add at least one track");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let uploadedCoverUrl = coverUrl;

      // Upload cover art if provided
      if (coverFile && !coverUrl) {
        setCoverUploading(true);
        const fileExt = coverFile.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: coverError } = await supabase.storage
          .from("artwork")
          .upload(fileName, coverFile);

        if (coverError) throw coverError;

        const { data: urlData } = supabase.storage.from("artwork").getPublicUrl(fileName);
        uploadedCoverUrl = urlData.publicUrl;
        setCoverUrl(uploadedCoverUrl);
        setCoverUploading(false);
      }

      setUploadProgress(10);

      // Create release
      const { data: release, error: releaseError } = await supabase
        .from("releases")
        .insert({
          title,
          artist_id: artistId,
          type,
          description: description || null,
          cover_art_url: uploadedCoverUrl,
          suggested_price_cents: suggestedPrice > 0 ? Math.round(suggestedPrice * 100) : null,
          is_published: isPublished,
          streaming_requires_donation: streamingRequiresDonation,
          published_at: isPublished ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (releaseError) throw releaseError;

      setUploadProgress(20);

      // Upload tracks
      const totalTracks = tracks.length;
      for (let i = 0; i < totalTracks; i++) {
        const track = tracks[i];

        // Update track to show uploading
        updateTrack(track.id, { uploading: true });

        try {
          // Upload audio file
          const fileExt = track.file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { error: audioError } = await supabase.storage
            .from("audio")
            .upload(fileName, track.file);

          if (audioError) throw audioError;

          // Create track record
          const { error: trackError } = await supabase.from("tracks").insert({
            release_id: release.id,
            title: track.title,
            track_number: track.trackNumber,
            audio_path: fileName,
            mood: track.mood || null,
            radio_enabled: true,
          });

          if (trackError) throw trackError;

          updateTrack(track.id, { uploading: false, uploaded: true });
        } catch (error: any) {
          updateTrack(track.id, { uploading: false, error: error.message });
          throw error;
        }

        // Update progress (20% for release, 80% for tracks)
        setUploadProgress(20 + ((i + 1) / totalTracks) * 80);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-releases"] });
      toast.success(`Album "${title}" uploaded successfully with ${totalTracks} tracks!`);
      handleClose();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload album");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    setTitle("");
    setArtistId("");
    setType("album");
    setDescription("");
    setSuggestedPrice(0);
    setIsPublished(false);
    setStreamingRequiresDonation(false);
    setCoverFile(null);
    setCoverPreview(null);
    setCoverUrl(null);
    setTracks([]);
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Disc3 className="w-5 h-5" />
            Mass Album Upload
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column - Album metadata */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground">Album Details</h3>

            <div>
              <Label htmlFor="album-title">Album Title *</Label>
              <Input
                id="album-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter album title"
                disabled={isUploading}
              />
            </div>

            <div>
              <Label htmlFor="album-artist">Artist *</Label>
              <Select value={artistId} onValueChange={setArtistId} disabled={isUploading}>
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
              <Label htmlFor="album-type">Release Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "album" | "single" | "ep")}
                disabled={isUploading}
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
              <Label htmlFor="album-description">Description</Label>
              <Textarea
                id="album-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Album description"
                rows={3}
                disabled={isUploading}
              />
            </div>

            <div>
              <Label htmlFor="album-price">Suggested Price ($)</Label>
              <Input
                id="album-price"
                type="number"
                min="0"
                step="0.01"
                value={suggestedPrice}
                onChange={(e) => setSuggestedPrice(parseFloat(e.target.value) || 0)}
                disabled={isUploading}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="album-published">Publish immediately</Label>
              <Switch
                id="album-published"
                checked={isPublished}
                onCheckedChange={setIsPublished}
                disabled={isUploading}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="album-donation">Streaming requires donation</Label>
              <Switch
                id="album-donation"
                checked={streamingRequiresDonation}
                onCheckedChange={setStreamingRequiresDonation}
                disabled={isUploading}
              />
            </div>

            {/* Cover Art */}
            <div>
              <Label>Cover Art</Label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverSelect}
                className="hidden"
                disabled={isUploading}
              />
              {coverPreview ? (
                <div className="relative inline-block mt-2">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-32 h-32 rounded-lg object-cover border border-border"
                  />
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => {
                        setCoverFile(null);
                        setCoverPreview(null);
                        setCoverUrl(null);
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-2 gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Upload Cover Art
                </Button>
              )}
            </div>
          </div>

          {/* Right column - Tracks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-muted-foreground">
                Tracks ({tracks.length})
              </h3>
              <input
                ref={tracksInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleTracksSelect}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => tracksInputRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Add Tracks
              </Button>
            </div>

            {/* Track list */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tracks.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground">
                  <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No tracks added yet</p>
                  <p className="text-xs mt-1">
                    Click "Add Tracks" to select audio files
                  </p>
                </div>
              ) : (
                tracks.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      track.uploaded
                        ? "bg-green-500/10 border-green-500/30"
                        : track.error
                        ? "bg-destructive/10 border-destructive/30"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveTrack(track.id, "up")}
                        disabled={isUploading || index === 0}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => moveTrack(track.id, "down")}
                        disabled={isUploading || index === tracks.length - 1}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    </div>

                    <span className="w-6 text-center text-sm font-medium text-muted-foreground">
                      {track.trackNumber}
                    </span>

                    <div className="flex-1 min-w-0">
                      <Input
                        value={track.title}
                        onChange={(e) => updateTrack(track.id, { title: e.target.value })}
                        placeholder="Track title"
                        className="h-8 text-sm"
                        disabled={isUploading}
                      />
                    </div>

                    <Select
                      value={track.mood}
                      onValueChange={(v) => updateTrack(track.id, { mood: v })}
                      disabled={isUploading}
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue placeholder="Mood" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chill">Chill</SelectItem>
                        <SelectItem value="energetic">Energetic</SelectItem>
                        <SelectItem value="focus">Focus</SelectItem>
                        <SelectItem value="happy">Happy</SelectItem>
                        <SelectItem value="melancholic">Melancholic</SelectItem>
                      </SelectContent>
                    </Select>

                    {track.uploading && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}

                    {!isUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeTrack(track.id)}
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </motion.div>
                ))
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Tip: Name your files like "01 - Track Title.mp3" for automatic numbering
            </p>
          </div>
        </div>

        {/* Upload progress */}
        {isUploading && (
          <div className="space-y-2 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading album...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={uploadAlbum}
            disabled={isUploading || !title || !artistId || tracks.length === 0}
            className="flex-1"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Album
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
