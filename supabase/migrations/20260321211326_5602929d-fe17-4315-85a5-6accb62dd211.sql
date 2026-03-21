CREATE POLICY "Authenticated users can read audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio' AND auth.uid() IS NOT NULL);