import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Upload, Check, Loader2, Music, AlertCircle, RefreshCw } from "lucide-react";

interface Track {
  id: string;
  title: string;
  track_number: number;
  audio_path: string;
}

interface BulkAudioReuploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  releaseId: string;
  releaseTitle: string;
}

interface FileMatch {
  trackId: string;
  trackTitle: string;
  trackNumber: number;
  file: File | null;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

export function BulkAudioReupload({
  open,
  onOpenChange,
  releaseId,
  releaseTitle,
}: BulkAudioReuploadProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [matches, setMatches] = useState<FileMatch[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch tracks for this release
  const { data: tracks, isLoading } = useQuery({
    queryKey: ["release-tracks", releaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("id, title, track_number, audio_path")
        .eq("release_id", releaseId)
        .order("track_number");
      if (error) throw error;
      return data as Track[];
    },
    enabled: open,
  });

  // When files are selected, try to match them to tracks by filename
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !tracks) return;

    const newMatches: FileMatch[] = tracks.map((track) => {
      // Try to match by track number in filename (e.g., "01 - Title.mp3")
      const matchedFile = files.find((f) => {
        const name = f.name.replace(/\.[^/.]+$/, "").toLowerCase();
        const trackNumMatch = name.match(/^(\d+)/);
        if (trackNumMatch && parseInt(trackNumMatch[1]) === track.track_number) {
          return true;
        }
        // Also try matching by title
        return name.includes(track.title.toLowerCase().substring(0, 10));
      });

      return {
        trackId: track.id,
        trackTitle: track.title,
        trackNumber: track.track_number,
        file: matchedFile || null,
        uploading: false,
        uploaded: false,
      };
    });

    // For unmatched files, assign them in order to unmatched tracks
    const unmatchedFiles = files.filter(
      (f) => !newMatches.some((m) => m.file === f)
    );
    const unmatchedTracks = newMatches.filter((m) => !m.file);

    unmatchedFiles.forEach((file, idx) => {
      if (idx < unmatchedTracks.length) {
        unmatchedTracks[idx].file = file;
      }
    });

    setMatches(newMatches);

    const matched = newMatches.filter((m) => m.file).length;
    toast.success(`Matched ${matched} of ${tracks.length} tracks`);
  };

  // Allow manual file assignment per track
  const handleSingleFile = (trackId: string, file: File) => {
    setMatches((prev) =>
      prev.map((m) => (m.trackId === trackId ? { ...m, file } : m))
    );
  };

  // Upload all matched files
  const handleUploadAll = async () => {
    const toUpload = matches.filter((m) => m.file && !m.uploaded);
    if (!toUpload.length) {
      toast.error("No files to upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    for (let i = 0; i < toUpload.length; i++) {
      const match = toUpload[i];
      setMatches((prev) =>
        prev.map((m) =>
          m.trackId === match.trackId ? { ...m, uploading: true } : m
        )
      );

      try {
        const file = match.file!;
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("audio")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Update the track's audio_path
        const { error: updateError } = await supabase
          .from("tracks")
          .update({ audio_path: fileName })
          .eq("id", match.trackId);

        if (updateError) throw updateError;

        setMatches((prev) =>
          prev.map((m) =>
            m.trackId === match.trackId
              ? { ...m, uploading: false, uploaded: true }
              : m
          )
        );
      } catch (error: any) {
        setMatches((prev) =>
          prev.map((m) =>
            m.trackId === match.trackId
              ? { ...m, uploading: false, error: error.message }
              : m
          )
        );
      }

      setUploadProgress(((i + 1) / toUpload.length) * 100);
    }

    setIsUploading(false);
    queryClient.invalidateQueries({ queryKey: ["admin-tracks"] });
    queryClient.invalidateQueries({ queryKey: ["admin-releases"] });
    toast.success("Audio files re-uploaded successfully!");
  };

  const handleClose = () => {
    if (isUploading) return;
    setMatches([]);
    setUploadProgress(0);
    onOpenChange(false);
  };

  const matchedCount = matches.filter((m) => m.file).length;
  const uploadedCount = matches.filter((m) => m.uploaded).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Re-upload Audio: {releaseTitle}
          </DialogTitle>
          <DialogDescription>
            Select all audio files at once. They'll be auto-matched to tracks by filename or track number.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* File selector */}
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                onChange={handleFilesSelect}
                className="hidden"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full gap-2 h-16 border-dashed"
              >
                <Upload className="w-5 h-5" />
                Select All Audio Files ({tracks?.length || 0} tracks expected)
              </Button>

              {matchedCount > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {matchedCount} of {tracks?.length} tracks matched •{" "}
                  {uploadedCount} uploaded
                </p>
              )}
            </div>

            {/* Track list with matched files */}
            {matches.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {matches.map((match) => (
                  <div
                    key={match.trackId}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      match.uploaded
                        ? "border-green-500/50 bg-green-500/5"
                        : match.error
                        ? "border-destructive/50 bg-destructive/5"
                        : match.file
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    <span className="text-xs text-muted-foreground w-6 text-center font-mono">
                      {match.trackNumber}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {match.trackTitle}
                      </p>
                      {match.file ? (
                        <p className="text-xs text-muted-foreground truncate">
                          → {match.file.name}
                        </p>
                      ) : (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          No file matched
                        </p>
                      )}
                      {match.error && (
                        <p className="text-xs text-destructive">{match.error}</p>
                      )}
                    </div>

                    {/* Per-track file picker for unmatched */}
                    {!match.file && !match.uploaded && !isUploading && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleSingleFile(match.trackId, f);
                          }}
                        />
                        <Button variant="ghost" size="sm" asChild>
                          <span className="gap-1">
                            <Music className="w-3 h-3" />
                            Pick
                          </span>
                        </Button>
                      </label>
                    )}

                    {/* Status */}
                    {match.uploading && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {match.uploaded && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUploadAll}
                disabled={isUploading || matchedCount === 0}
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
                    Upload {matchedCount} Files
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
