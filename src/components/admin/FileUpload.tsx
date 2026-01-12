import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Upload, X, Loader2, Image, Music } from "lucide-react";

interface FileUploadProps {
  bucket: "artwork" | "audio";
  currentUrl?: string;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export function FileUpload({
  bucket,
  currentUrl,
  onUpload,
  onRemove,
  accept,
  maxSizeMB = 10,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAudio = bucket === "audio";
  const defaultAccept = isAudio ? "audio/*" : "image/*";

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File too large. Max size is ${maxSizeMB}MB`);
      return;
    }

    // Validate file type
    const validTypes = isAudio
      ? ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/flac", "audio/aac"]
      : ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!validTypes.some((type) => file.type.startsWith(type.split("/")[0]))) {
      toast.error(`Invalid file type. Please upload ${isAudio ? "an audio" : "an image"} file.`);
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Set preview for images
      if (!isAudio) {
        setPreview(publicUrl);
      } else {
        setPreview(filePath); // For audio, store the path
      }

      onUpload(isAudio ? filePath : publicUrl);
      toast.success("File uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove?.();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept || defaultAccept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {/* Preview */}
      {preview && !isAudio && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="w-32 h-32 rounded-lg object-cover border border-border"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {preview && isAudio && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <Music className="w-5 h-5 text-primary" />
          <span className="text-sm truncate flex-1">{preview}</span>
          <button
            type="button"
            onClick={handleRemove}
            className="w-6 h-6 rounded-full bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            {isAudio ? <Music className="w-4 h-4" /> : <Image className="w-4 h-4" />}
            {preview ? "Replace" : "Upload"} {isAudio ? "Audio" : "Image"}
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        Max {maxSizeMB}MB • {isAudio ? "MP3, WAV, OGG, FLAC" : "JPG, PNG, WebP, GIF"}
      </p>
    </div>
  );
}
