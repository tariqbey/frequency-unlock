import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  MessageSquare,
  User,
  Clock,
  Pin,
  Send,
  Loader2,
  Trash2,
  Pencil,
} from "lucide-react";
import { VoteButtons } from "@/components/forum/VoteButtons";
import { EditThreadDialog } from "@/components/forum/EditThreadDialog";
import { EditCommentDialog } from "@/components/forum/EditCommentDialog";

interface Thread {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
  } | null;
  forums: {
    title: string;
  } | null;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
  } | null;
}

export default function ForumThread() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [editingThread, setEditingThread] = useState(false);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);

  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ["thread", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("threads")
        .select(`
          *,
          forums (title)
        `)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Fetch profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", data.user_id)
        .maybeSingle();

      return {
        ...data,
        profiles: profile,
      } as Thread;
    },
    enabled: !!id,
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("thread_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch profiles for comments
      const userIds = [...new Set(data?.map((c) => c.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, { display_name: string | null }>);

      return data?.map((comment) => ({
        ...comment,
        profiles: profileMap[comment.user_id] || null,
      })) as Comment[];
    },
    enabled: !!id,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      if (!newComment.trim()) throw new Error("Comment cannot be empty");

      const { error } = await supabase.from("comments").insert({
        body: newComment.trim(),
        thread_id: id,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      setNewComment("");
      toast.success("Comment added!");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", id] });
      toast.success("Comment deleted");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (threadLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-3xl pt-24 pb-32">
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container max-w-3xl pt-24 pb-32 text-center">
          <h1 className="text-2xl font-bold mb-4">Post not found</h1>
          <Button onClick={() => navigate("/forum")}>Back to Forum</Button>
        </main>
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(thread.created_at), { addSuffix: true });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container max-w-3xl pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate("/forum")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Forum
          </Button>

          {/* Thread */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                {/* Vote buttons */}
                <div className="hidden sm:block">
                  <VoteButtons threadId={thread.id} orientation="vertical" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    {thread.pinned && (
                      <Badge variant="secondary" className="gap-1">
                        <Pin className="w-3 h-3" />
                        Pinned
                      </Badge>
                    )}
                    {thread.forums && (
                      <Badge variant="outline">{thread.forums.title}</Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">{thread.title}</h1>
                    {user?.id === thread.user_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => setEditingThread(true)}
                      >
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{thread.profiles?.display_name || "Anonymous"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{timeAgo}</span>
                    </div>
                    {/* Mobile vote buttons */}
                    <div className="sm:hidden">
                      <VoteButtons threadId={thread.id} orientation="horizontal" size="sm" />
                    </div>
                  </div>

                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-foreground/90">{thread.body}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments section */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {comments?.length || 0} Comments
            </h2>

            {/* Add comment */}
            {user ? (
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="pt-4">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="resize-none mb-3"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => addComment.mutate()}
                      disabled={addComment.isPending || !newComment.trim()}
                      className="gap-2"
                    >
                      {addComment.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Comment
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground mb-3">Sign in to join the conversation</p>
                  <Button onClick={() => navigate("/auth")} size="sm">
                    Sign In
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Comments list */}
            {commentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : comments && comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment, index) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="border-border/50 bg-card/30">
                      <CardContent className="py-4">
                        <div className="flex gap-3">
                          {/* Vote buttons for comment */}
                          <VoteButtons commentId={comment.id} orientation="vertical" size="sm" />

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {comment.profiles?.display_name || "Anonymous"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(comment.created_at), {
                                        addSuffix: true,
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <p className="text-sm text-foreground/90 whitespace-pre-wrap">
                                  {comment.body}
                                </p>
                              </div>
                              {user?.id === comment.user_id && (
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                    onClick={() => setEditingComment(comment)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => deleteComment.mutate(comment.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to share your thoughts!
              </p>
            )}
          </div>
        </motion.div>

        {/* Edit Thread Dialog */}
        {thread && (
          <EditThreadDialog
            open={editingThread}
            onOpenChange={setEditingThread}
            thread={thread}
          />
        )}

        {/* Edit Comment Dialog */}
        {editingComment && id && (
          <EditCommentDialog
            open={!!editingComment}
            onOpenChange={(open) => !open && setEditingComment(null)}
            comment={editingComment}
            threadId={id}
          />
        )}
      </main>
    </div>
  );
}
