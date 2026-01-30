import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileImageUploadProps {
  userId: string;
  currentUrl?: string | null;
  type: "avatar" | "cover";
  onUploadComplete: (url: string) => void;
  className?: string;
}

export function ProfileImageUpload({
  userId,
  currentUrl,
  type,
  onUploadComplete,
  className,
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("profiles")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("profiles")
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update profile in database
      const updateField = type === "avatar" ? "avatar_url" : "cover_url";
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [updateField]: publicUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      onUploadComplete(publicUrl);
      toast.success(`${type === "avatar" ? "Profile picture" : "Cover photo"} updated!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (type === "avatar") {
    return (
      <div className={cn("relative group", className)}>
        <div className="w-24 h-24 rounded-full overflow-hidden bg-muted border-4 border-background shadow-lg">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
        </div>
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-0 right-0 rounded-full w-8 h-8 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    );
  }

  // Cover photo
  return (
    <div className={cn("relative group", className)}>
      <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-secondary/20">
        {currentUrl ? (
          <img
            src={currentUrl}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-muted-foreground text-sm">Add a cover photo</p>
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="absolute bottom-4 right-4 gap-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Camera className="w-4 h-4" />
            Change Cover
          </>
        )}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
