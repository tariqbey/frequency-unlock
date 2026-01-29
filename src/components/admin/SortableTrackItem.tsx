import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, X, Loader2, Check } from "lucide-react";

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

interface SortableTrackItemProps {
  track: TrackFile;
  disabled?: boolean;
  showMood?: boolean;
  onUpdateTitle: (title: string) => void;
  onUpdateMood?: (mood: string) => void;
  onRemove: () => void;
}

export function SortableTrackItem({
  track,
  disabled,
  showMood = false,
  onUpdateTitle,
  onUpdateMood,
  onRemove,
}: SortableTrackItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 rounded-lg border ${
        track.uploaded
          ? "border-green-500/50 bg-green-500/5"
          : track.uploading
          ? "border-primary/50 bg-primary/5"
          : track.error
          ? "border-destructive/50 bg-destructive/5"
          : "border-border bg-muted/30"
      }`}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className={`touch-none p-1 rounded hover:bg-accent cursor-grab active:cursor-grabbing ${
          disabled ? "opacity-30 pointer-events-none" : ""
        }`}
        disabled={disabled}
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Track number */}
      <span className="text-xs text-muted-foreground w-6 text-center font-medium">
        {track.trackNumber}
      </span>

      {/* Title input */}
      <Input
        value={track.title}
        onChange={(e) => onUpdateTitle(e.target.value)}
        className="flex-1 h-8 text-sm"
        placeholder="Track title"
        disabled={disabled || track.uploaded || track.uploading}
      />

      {/* Mood selector (optional) */}
      {showMood && onUpdateMood && (
        <Select
          value={track.mood}
          onValueChange={onUpdateMood}
          disabled={disabled || track.uploaded || track.uploading}
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
      )}

      {/* Status indicators */}
      {track.uploading ? (
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      ) : track.uploaded ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : !disabled ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
        >
          <X className="w-3 h-3" />
        </Button>
      ) : null}
    </div>
  );
}
