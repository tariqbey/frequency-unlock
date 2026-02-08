import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mic, FileText, Upload, X, Loader2, Quote } from "lucide-react";

interface TrackCommentaryEditorProps {
  trackId: string;
  trackTitle: string;
  existingCommentary?: {
    id: string;
    commentary_text: string;
    commentary_audio_path: string | null;
  } | null;
  onSave?: () => void;
  disabled?: boolean;
}

export function TrackCommentaryEditor({
  trackId,
  trackTitle,
  existingCommentary,
  onSave,
  disabled,
}: TrackCommentaryEditorProps) {
  const [commentaryText, setCommentaryText] = useState(existingCommentary?.commentary_text || "");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreviewName, setAudioPreviewName] = useState<string | null>(
    existingCommentary?.commentary_audio_path ? "Existing audio" : null
  );
  const [isSaving, setIsSaving] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Audio file too large. Max size is 50MB");
      return;
    }

    setAudioFile(file);
    setAudioPreviewName(file.name);
  };

  const handleSave = async () => {
    if (!commentaryText.trim() && !audioFile && !existingCommentary?.commentary_audio_path) {
      toast.error("Add text or audio commentary");
      return;
    }

    setIsSaving(true);

    try {
      let audioPath = existingCommentary?.commentary_audio_path || null;

      // Upload audio if provided
      if (audioFile) {
        const fileExt = audioFile.name.split(".").pop();
        const fileName = `commentary/${trackId}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("audio")
          .upload(fileName, audioFile);

        if (uploadError) throw uploadError;
        audioPath = fileName;
      }

      // Upsert commentary
      const { error } = await supabase
        .from("track_commentary")
        .upsert({
          track_id: trackId,
          commentary_text: commentaryText.trim(),
          commentary_audio_path: audioPath,
        }, {
          onConflict: "track_id",
        });

      if (error) throw error;

      toast.success("Commentary saved!");
      onSave?.();
    } catch (error: any) {
      console.error("Error saving commentary:", error);
      toast.error(error.message || "Failed to save commentary");
    } finally {
      setIsSaving(false);
    }
  };

  const clearAudio = () => {
    setAudioFile(null);
    setAudioPreviewName(null);
    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Quote className="w-4 h-4 text-primary" />
        <span>Commentary for "{trackTitle}"</span>
      </div>

      {/* Text commentary */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" />
          Written Commentary
        </Label>
        <Textarea
          value={commentaryText}
          onChange={(e) => setCommentaryText(e.target.value)}
          placeholder="Share the story behind this track..."
          rows={4}
          disabled={disabled || isSaving}
          className="resize-none"
        />
      </div>

      {/* Audio commentary */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Mic className="w-4 h-4" />
          Audio Commentary (optional)
        </Label>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioSelect}
          className="hidden"
          disabled={disabled || isSaving}
        />
        
        {audioPreviewName ? (
          <div className="flex items-center gap-2 p-2 rounded bg-muted">
            <Mic className="w-4 h-4 text-primary" />
            <span className="text-sm flex-1 truncate">{audioPreviewName}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearAudio}
              disabled={disabled || isSaving}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => audioInputRef.current?.click()}
            disabled={disabled || isSaving}
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Audio Commentary
          </Button>
        )}
      </div>

      {/* Save button */}
      <Button
        onClick={handleSave}
        disabled={disabled || isSaving || (!commentaryText.trim() && !audioFile && !existingCommentary?.commentary_audio_path)}
        size="sm"
        className="gap-2"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Commentary"
        )}
      </Button>
    </div>
  );
}
