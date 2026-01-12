import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Send, Loader2 } from "lucide-react";

interface Forum {
  id: string;
  title: string;
}

export default function NewThread() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [forumId, setForumId] = useState<string>("");

  const { data: forums } = useQuery({
    queryKey: ["forums"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forums")
        .select("id, title")
        .order("title");
      if (error) throw error;
      return data as Forum[];
    },
  });

  const createThread = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Must be logged in");
      if (!forumId) throw new Error("Please select a category");
      if (!title.trim()) throw new Error("Title is required");
      if (!body.trim()) throw new Error("Post content is required");

      const { data, error } = await supabase
        .from("threads")
        .insert({
          title: title.trim(),
          body: body.trim(),
          forum_id: forumId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["threads"] });
      toast.success("Post created!");
      navigate(`/forum/thread/${data.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Redirect if not logged in
  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container max-w-2xl pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/forum")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create a Post</h1>
              <p className="text-muted-foreground">Share something with the community</p>
            </div>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardContent className="pt-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="forum">Category</Label>
                <Select value={forumId} onValueChange={setForumId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {forums?.map((forum) => (
                      <SelectItem key={forum.id} value={forum.id}>
                        {forum.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="What's on your mind?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {title.length}/200
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Content</Label>
                <Textarea
                  id="body"
                  placeholder="Share your thoughts, ask a question, or start a discussion..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => navigate("/forum")}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createThread.mutate()}
                  disabled={createThread.isPending || !title.trim() || !body.trim() || !forumId}
                  className="gap-2"
                >
                  {createThread.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Post
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
