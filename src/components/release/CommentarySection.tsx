import { motion, AnimatePresence } from "framer-motion";
import { X, Quote, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Commentary {
  id: string;
  commentary_text: string;
  commentary_audio_path: string | null;
  timestamp_notes_json: Record<string, string> | null;
}

interface CommentarySectionProps {
  trackTitle: string;
  artistName: string;
  commentary: Commentary | null;
  onClose: () => void;
}

export function CommentarySection({
  trackTitle,
  artistName,
  commentary,
  onClose,
}: CommentarySectionProps) {
  if (!commentary) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="glass-card overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Quote className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-gradient">
                Behind the Frequency
              </h3>
              <p className="text-xs text-muted-foreground">
                {artistName} on "{trackTitle}"
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          {commentary.commentary_audio_path && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Mic className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Audio Commentary Available</p>
                <p className="text-xs text-muted-foreground">Listen to the artist explain this track</p>
              </div>
              <Button variant="outline" size="sm">
                Play
              </Button>
            </div>
          )}

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
          >
            {commentary.commentary_text}
          </motion.p>

          {/* Timestamp notes */}
          {commentary.timestamp_notes_json && Object.keys(commentary.timestamp_notes_json).length > 0 && (
            <div className="mt-6 pt-6 border-t border-border/50">
              <h4 className="text-sm font-semibold mb-3">Timestamp Notes</h4>
              <div className="space-y-2">
                {Object.entries(commentary.timestamp_notes_json).map(([time, note]) => (
                  <div key={time} className="flex gap-3 text-sm">
                    <span className="font-mono text-primary shrink-0">{time}</span>
                    <span className="text-muted-foreground">{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
