
-- Delete track commentary for Holy Ghost 2 & 3 tracks
DELETE FROM public.track_commentary WHERE track_id IN (
  SELECT t.id FROM public.tracks t WHERE t.release_id IN (
    'f5f35253-8f5e-41ee-8a77-671524ca217b',
    'e1c02f42-1cb6-491d-b113-f85fe25ecc42'
  )
);

-- Delete tracks for Holy Ghost 2 & 3
DELETE FROM public.tracks WHERE release_id IN (
  'f5f35253-8f5e-41ee-8a77-671524ca217b',
  'e1c02f42-1cb6-491d-b113-f85fe25ecc42'
);

-- Delete the releases
DELETE FROM public.releases WHERE id IN (
  'f5f35253-8f5e-41ee-8a77-671524ca217b',
  'e1c02f42-1cb6-491d-b113-f85fe25ecc42'
);
