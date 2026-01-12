import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Clock,
  Pin,
  User,
  Plus,
  Search,
  Flame,
  Loader2,
} from "lucide-react";
import { VoteButtons } from "@/components/forum/VoteButtons";

interface Thread {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  user_id: string;
  forum_id: string;
  profiles: {
    display_name: string | null;
  } | null;
  forums: {
    title: string;
  } | null;
  comment_count: number;
}

interface Forum {
  id: string;
  title: string;
  description: string | null;
}

export default function ForumPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForum, setSelectedForum] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"hot" | "new">("hot");

  const { data: forums } = useQuery({
    queryKey: ["forums"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forums")
        .select("*")
        .order("title");
      if (error) throw error;
      return data as Forum[];
    },
  });

  const { data: threads, isLoading } = useQuery({
    queryKey: ["threads", selectedForum, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("threads")
        .select(`
          *,
          forums (title)
        `);

      if (selectedForum) {
        query = query.eq("forum_id", selectedForum);
      }

      if (sortBy === "new") {
        query = query.order("created_at", { ascending: false });
      } else {
        // "Hot" - pinned first, then by recency
        query = query.order("pinned", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      // Get user IDs to fetch profiles
      const userIds = [...new Set(data?.map((t) => t.user_id) || [])];
      
      // Fetch profiles separately
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, { display_name: string | null }>);

      // Get comment counts for each thread
      const threadIds = data?.map((t) => t.id) || [];
      const { data: commentCounts } = await supabase
        .from("comments")
        .select("thread_id")
        .in("thread_id", threadIds);

      const countMap = (commentCounts || []).reduce((acc, c) => {
        acc[c.thread_id] = (acc[c.thread_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return data?.map((thread) => ({
        ...thread,
        profiles: profileMap[thread.user_id] || null,
        comment_count: countMap[thread.id] || 0,
      })) as Thread[];
    },
  });

  const filteredThreads = threads?.filter(
    (thread) =>
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.body.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinnedThreads = filteredThreads?.filter((t) => t.pinned) || [];
  const regularThreads = filteredThreads?.filter((t) => !t.pinned) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container max-w-4xl pt-24 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Community Forum</h1>
              <p className="text-muted-foreground">
                Discuss music, share discoveries, connect with artists
              </p>
            </div>
            {user && (
              <Button onClick={() => navigate("/forum/new")} className="gap-2">
                <Plus className="w-4 h-4" />
                New Post
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "hot" | "new")}>
              <TabsList>
                <TabsTrigger value="hot" className="gap-2">
                  <Flame className="w-4 h-4" />
                  Hot
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-2">
                  <Clock className="w-4 h-4" />
                  New
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Forum Categories */}
          {forums && forums.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedForum === null ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/90 transition-colors"
                onClick={() => setSelectedForum(null)}
              >
                All
              </Badge>
              {forums.map((forum) => (
                <Badge
                  key={forum.id}
                  variant={selectedForum === forum.id ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/90 transition-colors"
                  onClick={() => setSelectedForum(forum.id)}
                >
                  {forum.title}
                </Badge>
              ))}
            </div>
          )}

          {/* Feed */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredThreads && filteredThreads.length > 0 ? (
            <div className="space-y-3">
              {/* Pinned Posts */}
              {pinnedThreads.length > 0 && (
                <div className="space-y-3">
                  {pinnedThreads.map((thread, index) => (
                    <ThreadCard key={thread.id} thread={thread} index={index} />
                  ))}
                </div>
              )}

              {/* Regular Posts */}
              {regularThreads.map((thread, index) => (
                <ThreadCard key={thread.id} thread={thread} index={index + pinnedThreads.length} />
              ))}
            </div>
          ) : (
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="py-16 text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-xl font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground mb-6">
                  {user
                    ? "Be the first to start a discussion!"
                    : "Sign in to start a discussion"}
                </p>
                {user ? (
                  <Button onClick={() => navigate("/forum/new")}>Create Post</Button>
                ) : (
                  <Button onClick={() => navigate("/auth")}>Sign In</Button>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>
    </div>
  );
}

interface ThreadCardProps {
  thread: Thread;
  index: number;
}

function ThreadCard({ thread, index }: ThreadCardProps) {
  const timeAgo = formatDistanceToNow(new Date(thread.created_at), { addSuffix: true });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={`/forum/thread/${thread.id}`}>
        <Card className="border-border/50 bg-card/50 backdrop-blur hover:bg-card/80 hover:border-primary/30 transition-all duration-200 group">
          <CardContent className="p-4 sm:p-6">
            <div className="flex gap-4">
              {/* Vote buttons */}
              <div className="hidden sm:block" onClick={(e) => e.preventDefault()}>
                <VoteButtons threadId={thread.id} orientation="vertical" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {thread.pinned && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Pin className="w-3 h-3" />
                      Pinned
                    </Badge>
                  )}
                  {thread.forums && (
                    <Badge variant="outline" className="text-xs">
                      {thread.forums.title}
                    </Badge>
                  )}
                </div>

                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
                  {thread.title}
                </h3>

                <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                  {thread.body}
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{thread.profiles?.display_name || "Anonymous"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:hidden">
                    <MessageSquare className="w-3 h-3" />
                    <span>{thread.comment_count} comments</span>
                  </div>
                </div>
              </div>

              {/* Comment count - desktop */}
              <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">{thread.comment_count}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
