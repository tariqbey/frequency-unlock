import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFullAlbumListen } from "@/hooks/useFullAlbumListen";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FullListenPrompt } from "./FullListenPrompt";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  MessageSquare,
  Send,
  Loader2,
  User,
  Trash2,
  Lock,
} from "lucide-react";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profile?: {
    display_name: string | null;
  };
}

interface ReleaseCommentsProps {
  releaseId: string;
  releaseTitle: string;
  trackIds: string[];
  onStartFullListen: () => void;
}

export function ReleaseComments({
  releaseId,
  releaseTitle,
  trackIds,
  onStartFullListen,
}: ReleaseCommentsProps) {
  const { user } = useAuth();
  const { hasCompletedListen } = useFullAlbumListen();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const canComment = user && hasCompletedListen(releaseId);

  // Fetch comments for this release
  const { data: comments, isLoading } = useQuery({
    queryKey: ["release-comments", releaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          body,
          created_at,
          user_id
        `)
        .eq("release_id", releaseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for comments
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", userIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, p]) || []
        );

        return data.map((comment) => ({
          ...comment,
          profile: profileMap.get(comment.user_id),
        })) as Comment[];
      }

      return data as Comment[];
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!user) throw new Error("Not authenticated");
      if (!hasCompletedListen(releaseId)) {
        throw new Error("Complete a full album listen to comment");
      }

      const { error } = await supabase.from("comments").insert({
        body,
        release_id: releaseId,
        user_id: user.id,
        thread_id: releaseId, // Using release_id as thread_id for compatibility
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["release-comments", releaseId] });
      setNewComment("");
      toast.success("Comment posted!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["release-comments", releaseId] });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment.trim());
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
        <h2 className="font-display text-lg sm:text-xl font-semibold">Album Comments</h2>
        {comments && comments.length > 0 && (
          <span className="text-xs sm:text-sm text-muted-foreground">
            ({comments.length})
          </span>
        )}
      </div>

      {/* Full Listen Prompt or Comment Form */}
      {!canComment ? (
        <FullListenPrompt
          releaseId={releaseId}
          releaseTitle={releaseTitle}
          trackIds={trackIds}
          onStartFullListen={onStartFullListen}
        />
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts on this album..."
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newComment.trim() || createCommentMutation.isPending}
              className="gap-2"
            >
              {createCommentMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Post Comment
            </Button>
          </div>
        </motion.form>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments && comments.length > 0 ? (
          <AnimatePresence>
            {comments.map((comment, index) => (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-3 sm:p-4"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-medium text-xs sm:text-sm">
                        {comment.profile?.display_name || "Anonymous"}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-[10px] sm:text-xs text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM d, yyyy")}
                        </span>
                        {user?.id === comment.user_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 sm:h-6 sm:w-6"
                            onClick={() => {
                              if (confirm("Delete this comment?")) {
                                deleteCommentMutation.mutate(comment.id);
                              }
                            }}
                          >
                            <Trash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                      {comment.body}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs sm:text-sm">No comments yet</p>
            <p className="text-[10px] sm:text-xs mt-1">
              Be the first to share your thoughts on this album
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
