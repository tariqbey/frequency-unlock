-- Fix the overly permissive shares INSERT policy
DROP POLICY IF EXISTS "Anyone can create shares" ON public.shares;

-- Create a more restrictive policy - allow authenticated users or anyone (for anonymous tracking)
CREATE POLICY "Users can create shares"
ON public.shares FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  OR user_id IS NULL
);