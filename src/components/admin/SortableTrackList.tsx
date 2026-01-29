import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableTrackItem } from "./SortableTrackItem";
import { Music } from "lucide-react";

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

interface SortableTrackListProps {
  tracks: TrackFile[];
  disabled?: boolean;
  showMood?: boolean;
  onReorder: (tracks: TrackFile[]) => void;
  onUpdateTrack: (id: string, updates: Partial<TrackFile>) => void;
  onRemoveTrack: (id: string) => void;
  emptyMessage?: string;
}

export function SortableTrackList({
  tracks,
  disabled,
  showMood = false,
  onReorder,
  onUpdateTrack,
  onRemoveTrack,
  emptyMessage = "No tracks added yet",
}: SortableTrackListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tracks.findIndex((t) => t.id === active.id);
      const newIndex = tracks.findIndex((t) => t.id === over.id);

      const newTracks = arrayMove(tracks, oldIndex, newIndex);
      
      // Update track numbers
      const updatedTracks = newTracks.map((track, index) => ({
        ...track,
        trackNumber: index + 1,
      }));

      onReorder(updatedTracks);
    }
  };

  if (tracks.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center text-muted-foreground">
        <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
        <p className="text-xs mt-1">
          Click "Add Tracks" to select audio files
        </p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tracks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {tracks.map((track) => (
            <SortableTrackItem
              key={track.id}
              track={track}
              disabled={disabled}
              showMood={showMood}
              onUpdateTitle={(title) => onUpdateTrack(track.id, { title })}
              onUpdateMood={(mood) => onUpdateTrack(track.id, { mood })}
              onRemove={() => onRemoveTrack(track.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
