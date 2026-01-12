-- Create votes table for threads and comments
CREATE TABLE public.votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid REFERENCES public.threads(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
  vote_type smallint NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Ensure either thread_id or comment_id is set, but not both
  CONSTRAINT vote_target_check CHECK (
    (thread_id IS NOT NULL AND comment_id IS NULL) OR
    (thread_id IS NULL AND comment_id IS NOT NULL)
  ),
  -- Unique constraint to prevent duplicate votes
  CONSTRAINT unique_thread_vote UNIQUE (user_id, thread_id),
  CONSTRAINT unique_comment_vote UNIQUE (user_id, comment_id)
);

-- Enable RLS
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_votes_thread_id ON public.votes(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX idx_votes_comment_id ON public.votes(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_votes_user_id ON public.votes(user_id);

-- RLS Policies
-- Anyone can view votes
CREATE POLICY "Anyone can view votes"
  ON public.votes FOR SELECT
  USING (true);

-- Active users can create votes
CREATE POLICY "Active users can vote"
  ON public.votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND is_user_active(auth.uid()));

-- Users can update their own votes
CREATE POLICY "Users can update their own votes"
  ON public.votes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own votes
CREATE POLICY "Users can delete their own votes"
  ON public.votes FOR DELETE
  USING (auth.uid() = user_id);