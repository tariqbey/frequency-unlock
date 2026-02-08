import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote, Mic, Play, Pause, Volume2, VolumeX, MessageCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFullAlbumListen } from "@/hooks/useFullAlbumListen";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface Commentary {
  id: string;
  commentary_text: string;
  commentary_audio_path: string | null;
  timestamp_notes_json: Record<string, string> | null;
}

interface TrackComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface TrackCommentaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle: string;
  artistName: string;
  releaseId: string;
  commentary: Commentary | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function TrackCommentaryDialog({
  open,
  onOpenChange,
  trackId,
  trackTitle,
  artistName,
  releaseId,
  commentary,
}: TrackCommentaryDialogProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { user } = useAuth();
  const { hasCompletedListen } = useFullAlbumListen();
  const queryClient = useQueryClient();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const canComment = hasCompletedListen(releaseId);

  // Fetch track comments
  const { data: comments = [] } = useQuery({
    queryKey: ["track-comments", trackId],
    queryFn: async () => {
      // Get thread for this track
      const { data: thread } = await supabase
        .from("threads")
        .select("id")
        .eq("title", `track:${trackId}`)
        .single();

      if (!thread) return [];

      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          body,
          created_at,
          user_id,
          profile:profiles!comments_user_id_fkey(display_name, avatar_url)
        `)
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as TrackComment[];
    },
    enabled: open && !!trackId,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error("Must be logged in");

      // Get or create thread for this track
      let { data: thread } = await supabase
        .from("threads")
        .select("id")
        .eq("title", `track:${trackId}`)
        .single();

      if (!thread) {
        // Get a forum for track discussions (or create one)
        let { data: forum } = await supabase
          .from("forums")
          .select("id")
          .eq("title", "Track Discussions")
          .single();

        if (!forum) {
          const { data: newForum, error: forumError } = await supabase
            .from("forums")
            .insert({ title: "Track Discussions", description: "Discuss individual tracks" })
            .select("id")
            .single();
          if (forumError) throw forumError;
          forum = newForum;
        }

        const { data: newThread, error: threadError } = await supabase
          .from("threads")
          .insert({
            title: `track:${trackId}`,
            body: `Discussion for track: ${trackTitle}`,
            forum_id: forum.id,
            user_id: user.id,
          })
          .select("id")
          .single();
        if (threadError) throw threadError;
        thread = newThread;
      }

      const { error } = await supabase.from("comments").insert({
        thread_id: thread.id,
        release_id: releaseId,
        body,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["track-comments", trackId] });
      toast.success("Comment added!");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  // Get signed URL for commentary audio
  useEffect(() => {
    if (commentary?.commentary_audio_path && open) {
      const getSignedUrl = async () => {
        const { data } = await supabase.storage
          .from("audio")
          .createSignedUrl(commentary.commentary_audio_path!, 3600);
        if (data?.signedUrl) {
          setAudioUrl(data.signedUrl);
        }
      };
      getSignedUrl();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setAudioUrl(null);
    };
  }, [commentary?.commentary_audio_path, open]);

  // Setup audio element
  useEffect(() => {
    if (audioUrl && !audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.volume = volume;

      audioRef.current.addEventListener("loadedmetadata", () => {
        setDuration(audioRef.current?.duration || 0);
      });

      audioRef.current.addEventListener("timeupdate", () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (value: number[]) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    if (!audioRef.current) return;
    const newVolume = value[0];
    audioRef.current.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Quote className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <DialogTitle className="font-display text-gradient">
                Behind the Frequency
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {artistName} on "{trackTitle}"
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Artist Commentary Section */}
            {commentary ? (
              <div className="space-y-4">
                {/* Audio Player */}
                {audioUrl && (
                  <div className="rounded-xl bg-muted/50 p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Mic className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">Audio Commentary</p>
                        <p className="text-xs text-muted-foreground">
                          Listen to {artistName} explain this track
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
                        onClick={togglePlay}
                      >
                        {isPlaying ? (
                          <Pause className="w-5 h-5 text-primary-foreground" />
                        ) : (
                          <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                        )}
                      </Button>

                      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
                        {formatTime(currentTime)}
                      </span>

                      <Slider
                        value={[currentTime]}
                        max={duration || 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="flex-1"
                      />

                      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
                        {formatTime(duration)}
                      </span>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={toggleMute}
                      >
                        {isMuted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>

                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.01}
                        onValueChange={handleVolumeChange}
                        className="w-20"
                      />
                    </div>
                  </div>
                )}

                {/* Text Commentary */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-muted-foreground leading-relaxed whitespace-pre-wrap"
                >
                  {commentary.commentary_text}
                </motion.p>

                {/* Timestamp Notes */}
                {commentary.timestamp_notes_json && Object.keys(commentary.timestamp_notes_json).length > 0 && (
                  <div className="pt-4 border-t border-border/50">
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
            ) : (
              <div className="rounded-xl bg-muted/30 p-6 text-center">
                <Quote className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No artist commentary available for this track yet.
                </p>
              </div>
            )}

            {/* Listener Comments Section */}
            <div className="pt-4 border-t border-border/50">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h4 className="font-semibold">Listener Comments</h4>
                <span className="text-xs text-muted-foreground">({comments.length})</span>
              </div>

              {/* Add Comment */}
              {canComment ? (
                <div className="space-y-3 mb-6">
                  <Textarea
                    placeholder="Share your thoughts on this track..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="min-h-[80px] resize-none"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      size="sm"
                    >
                      {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/30 p-4 mb-6 flex items-center gap-3">
                  <Lock className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Comments Locked</p>
                    <p className="text-xs text-muted-foreground">
                      Listen to the full album without skipping to unlock commenting
                    </p>
                  </div>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                ) : (
                  <AnimatePresence>
                    {comments.map((comment, index) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-3"
                      >
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarImage src={comment.profile?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(comment.profile?.display_name || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">
                              {comment.profile?.display_name || "Anonymous"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(comment.created_at), "MMM d, yyyy")}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {comment.body}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
