import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  Clock,
  Pin,
  Plus,
  Search,
  Flame,
  Loader2,
  Heart,
  Share2,
  MoreHorizontal,
  Music,
  Disc3,
} from "lucide-react";
import { VoteButtons } from "@/components/forum/VoteButtons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    avatar_url: string | null;
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
        query = query.order("pinned", { ascending: false }).order("created_at", { ascending: false });
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;

      const userIds = [...new Set(data?.map((t) => t.user_id) || [])];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = (profiles || []).reduce((acc, p) => {
        acc[p.user_id] = p;
        return acc;
      }, {} as Record<string, { display_name: string | null; avatar_url: string | null }>);

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

      <main className="container max-w-2xl pt-20 pb-32 px-0 sm:px-4">
        {/* Stories-style header - scrollable categories */}
        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 pb-3 pt-4 px-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl sm:text-2xl font-bold">Feed</h1>
            {user && (
              <Button onClick={() => navigate("/forum/new")} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Post</span>
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search posts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-0 h-9"
            />
          </div>

          {/* Sort Tabs + Categories in horizontal scroll */}
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as "hot" | "new")}>
              <TabsList className="h-8">
                <TabsTrigger value="hot" className="gap-1.5 text-xs h-7 px-3">
                  <Flame className="w-3.5 h-3.5" />
                  Hot
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-1.5 text-xs h-7 px-3">
                  <Clock className="w-3.5 h-3.5" />
                  New
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="h-6 w-px bg-border shrink-0" />

            {/* Category Pills */}
            <div className="flex gap-2">
              <Badge
                variant={selectedForum === null ? "default" : "outline"}
                className="cursor-pointer shrink-0 text-xs"
                onClick={() => setSelectedForum(null)}
              >
                All
              </Badge>
              {forums?.map((forum) => (
                <Badge
                  key={forum.id}
                  variant={selectedForum === forum.id ? "default" : "outline"}
                  className="cursor-pointer shrink-0 text-xs whitespace-nowrap"
                  onClick={() => setSelectedForum(forum.id)}
                >
                  {forum.title}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Social Feed */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredThreads && filteredThreads.length > 0 ? (
          <div className="divide-y divide-border/50">
            {pinnedThreads.map((thread, index) => (
              <FeedPost key={thread.id} thread={thread} index={index} isPinned />
            ))}
            {regularThreads.map((thread, index) => (
              <FeedPost key={thread.id} thread={thread} index={index + pinnedThreads.length} />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {user ? "Be the first to start a discussion!" : "Sign in to start a discussion"}
            </p>
            {user ? (
              <Button onClick={() => navigate("/forum/new")}>Create Post</Button>
            ) : (
              <Button onClick={() => navigate("/auth")}>Sign In</Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

interface FeedPostProps {
  thread: Thread;
  index: number;
  isPinned?: boolean;
}

function FeedPost({ thread, index, isPinned }: FeedPostProps) {
  const timeAgo = formatDistanceToNow(new Date(thread.created_at), { addSuffix: true });
  const displayName = thread.profiles?.display_name || "Anonymous";
  const avatarUrl = thread.profiles?.avatar_url;
  const initials = displayName.charAt(0).toUpperCase();

  // Determine if this is a music-related post based on forum category
  const isMusicPost = thread.forums?.title?.toLowerCase().includes("music") || 
                      thread.forums?.title?.toLowerCase().includes("release");

  return (
    <motion.article
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.03 }}
      className="bg-background"
    >
      {/* Post Header - Author Info */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/forum/thread/${thread.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarImage src={avatarUrl || undefined} alt={displayName} />
            <AvatarFallback className="bg-gradient-primary text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{displayName}</span>
              {isPinned && (
                <Pin className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{timeAgo}</span>
              {thread.forums && (
                <>
                  <span>•</span>
                  <span className="text-primary/80">{thread.forums.title}</span>
                </>
              )}
            </div>
          </div>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Copy Link</DropdownMenuItem>
            <DropdownMenuItem>Report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Content */}
      <Link to={`/forum/thread/${thread.id}`} className="block">
        {/* Optional Music Visual for music-related posts */}
        {isMusicPost && (
          <div className="aspect-video bg-gradient-to-br from-primary/20 via-background to-primary/10 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,180,0,0.1),transparent_70%)]" />
            <Disc3 className="w-20 h-20 text-primary/30 animate-spin" style={{ animationDuration: '8s' }} />
            <Music className="w-8 h-8 text-primary absolute" />
          </div>
        )}

        {/* Text Content */}
        <div className="px-4 pb-3">
          <h3 className="font-semibold text-base mb-1.5 line-clamp-2">
            {thread.title}
          </h3>
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {thread.body}
          </p>
        </div>
      </Link>

      {/* Action Bar */}
      <div className="flex items-center gap-1 px-2 pb-3 border-b border-transparent">
        <div onClick={(e) => e.preventDefault()}>
          <VoteButtons threadId={thread.id} orientation="horizontal" size="sm" />
        </div>

        <Link 
          to={`/forum/thread/${thread.id}`} 
          className="flex items-center gap-1.5 px-3 py-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm">{thread.comment_count}</span>
        </Link>

        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 ml-auto">
          <Share2 className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Comment Preview - if there are comments */}
      {thread.comment_count > 0 && (
        <Link 
          to={`/forum/thread/${thread.id}`}
          className="block px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          View all {thread.comment_count} comment{thread.comment_count !== 1 ? 's' : ''}
        </Link>
      )}
    </motion.article>
  );
}
