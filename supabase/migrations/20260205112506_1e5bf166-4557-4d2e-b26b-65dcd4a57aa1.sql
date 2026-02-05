-- Fix radio_stats permissive INSERT policy (Supabase Lint 0024)
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert radio stats" ON public.radio_stats;

-- Create admin-only INSERT policy for radio_stats
CREATE POLICY "Admins can insert radio stats" 
ON public.radio_stats 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Fix profiles visibility for social features
-- Add a SELECT policy allowing authenticated users to view basic profile info
CREATE POLICY "Authenticated users can view other profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);