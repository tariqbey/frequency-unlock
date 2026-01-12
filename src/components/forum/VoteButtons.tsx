import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface VoteButtonsProps {
  threadId?: string;
  commentId?: string;
  initialScore?: number;
  initialUserVote?: number | null;
  orientation?: "vertical" | "horizontal";
  size?: "sm" | "md";
}

export function VoteButtons({
  threadId,
  commentId,
  initialScore = 0,
  initialUserVote = null,
  orientation = "vertical",
  size = "md",
}: VoteButtonsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [optimisticScore, setOptimisticScore] = useState(initialScore);
  const [optimisticVote, setOptimisticVote] = useState<number | null>(initialUserVote);

  const voteKey = threadId ? ["thread-vote", threadId] : ["comment-vote", commentId];

  // Fetch current vote state
  const { data: voteData } = useQuery({
    queryKey: voteKey,
    queryFn: async () => {
      if (!user) return { score: initialScore, userVote: null };

      // Get total score
      const { data: votes, error: votesError } = await supabase
        .from("votes")
        .select("vote_type")
        .eq(threadId ? "thread_id" : "comment_id", threadId || commentId);

      if (votesError) throw votesError;

      const score = (votes || []).reduce((sum, v) => sum + v.vote_type, 0);

      // Get user's vote
      const { data: userVoteData } = await supabase
        .from("votes")
        .select("vote_type")
        .eq(threadId ? "thread_id" : "comment_id", threadId || commentId)
        .eq("user_id", user.id)
        .maybeSingle();

      return {
        score,
        userVote: userVoteData?.vote_type || null,
      };
    },
    enabled: !!(threadId || commentId),
    staleTime: 30000,
  });

  const currentScore = voteData?.score ?? optimisticScore;
  const currentUserVote = voteData?.userVote ?? optimisticVote;

  const voteMutation = useMutation({
    mutationFn: async (voteType: 1 | -1) => {
      if (!user) throw new Error("Must be logged in to vote");

      const targetColumn = threadId ? "thread_id" : "comment_id";
      const targetId = threadId || commentId;

      // Check if user already voted
      const { data: existingVote } = await supabase
        .from("votes")
        .select("id, vote_type")
        .eq(targetColumn, targetId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Same vote - remove it
          const { error } = await supabase
            .from("votes")
            .delete()
            .eq("id", existingVote.id);
          if (error) throw error;
          return { action: "removed", voteType: null };
        } else {
          // Different vote - update it
          const { error } = await supabase
            .from("votes")
            .update({ vote_type: voteType })
            .eq("id", existingVote.id);
          if (error) throw error;
          return { action: "changed", voteType };
        }
      } else {
        // New vote
        const { error } = await supabase.from("votes").insert({
          [targetColumn]: targetId,
          user_id: user.id,
          vote_type: voteType,
        });
        if (error) throw error;
        return { action: "added", voteType };
      }
    },
    onMutate: async (voteType) => {
      // Optimistic update
      const prevVote = currentUserVote;
      let scoreDelta = 0;

      if (prevVote === voteType) {
        // Removing vote
        scoreDelta = -voteType;
        setOptimisticVote(null);
      } else if (prevVote) {
        // Changing vote
        scoreDelta = voteType * 2;
        setOptimisticVote(voteType);
      } else {
        // New vote
        scoreDelta = voteType;
        setOptimisticVote(voteType);
      }

      setOptimisticScore((prev) => prev + scoreDelta);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: voteKey });
    },
    onError: (error) => {
      // Revert optimistic update
      setOptimisticScore(voteData?.score ?? initialScore);
      setOptimisticVote(voteData?.userVote ?? initialUserVote);
      toast.error(error.message);
    },
  });

  const handleVote = (voteType: 1 | -1) => {
    if (!user) {
      toast.error("Sign in to vote");
      return;
    }
    voteMutation.mutate(voteType);
  };

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const buttonSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  const displayScore = voteData?.score ?? optimisticScore;
  const displayVote = voteData?.userVote ?? optimisticVote;

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        orientation === "vertical" ? "flex-col" : "flex-row"
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          "rounded-full transition-colors",
          displayVote === 1
            ? "text-primary bg-primary/10 hover:bg-primary/20"
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        )}
        onClick={() => handleVote(1)}
        disabled={voteMutation.isPending}
      >
        <ChevronUp className={iconSize} />
      </Button>

      <span
        className={cn(
          textSize,
          "font-semibold min-w-[2ch] text-center",
          displayScore > 0 && "text-primary",
          displayScore < 0 && "text-destructive",
          displayScore === 0 && "text-muted-foreground"
        )}
      >
        {displayScore}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className={cn(
          buttonSize,
          "rounded-full transition-colors",
          displayVote === -1
            ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
            : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        )}
        onClick={() => handleVote(-1)}
        disabled={voteMutation.isPending}
      >
        <ChevronDown className={iconSize} />
      </Button>
    </div>
  );
}
