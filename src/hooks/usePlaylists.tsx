import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track_id: string;
  position: number;
  added_at: string;
  track?: {
    id: string;
    title: string;
    duration_seconds: number | null;
    audio_path: string;
    release: {
      id: string;
      title: string;
      cover_art_url: string | null;
      artist: {
        id: string;
        name: string;
      };
    };
  };
}

export function usePlaylists() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: playlists, isLoading } = useQuery({
    queryKey: ["playlists", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as Playlist[];
    },
    enabled: !!user,
  });

  const createPlaylist = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from("playlists")
        .insert({
          user_id: user!.id,
          name,
          description: description || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist created");
    },
    onError: (error) => {
      toast.error("Failed to create playlist");
      console.error(error);
    },
  });

  const updatePlaylist = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      is_public,
    }: {
      id: string;
      name?: string;
      description?: string;
      is_public?: boolean;
    }) => {
      const updates: Partial<Playlist> = {};
      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (is_public !== undefined) updates.is_public = is_public;

      const { error } = await supabase
        .from("playlists")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist updated");
    },
    onError: (error) => {
      toast.error("Failed to update playlist");
      console.error(error);
    },
  });

  const deletePlaylist = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("playlists")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlists"] });
      toast.success("Playlist deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete playlist");
      console.error(error);
    },
  });

  const addTrackToPlaylist = useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      // Get current max position
      const { data: existing } = await supabase
        .from("playlist_tracks")
        .select("position")
        .eq("playlist_id", playlistId)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

      const { error } = await supabase
        .from("playlist_tracks")
        .insert({
          playlist_id: playlistId,
          track_id: trackId,
          position: nextPosition,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-tracks"] });
      toast.success("Track added to playlist");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Track already in playlist");
      } else {
        toast.error("Failed to add track");
        console.error(error);
      }
    },
  });

  const removeTrackFromPlaylist = useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: string; trackId: string }) => {
      const { error } = await supabase
        .from("playlist_tracks")
        .delete()
        .eq("playlist_id", playlistId)
        .eq("track_id", trackId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playlist-tracks"] });
      toast.success("Track removed from playlist");
    },
    onError: (error) => {
      toast.error("Failed to remove track");
      console.error(error);
    },
  });

  return {
    playlists,
    isLoading,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addTrackToPlaylist,
    removeTrackFromPlaylist,
  };
}

export function usePlaylistTracks(playlistId: string | undefined) {
  return useQuery({
    queryKey: ["playlist-tracks", playlistId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlist_tracks")
        .select(`
          id,
          playlist_id,
          track_id,
          position,
          added_at,
          track:tracks (
            id,
            title,
            duration_seconds,
            audio_path,
            release:releases (
              id,
              title,
              cover_art_url,
              artist:artists (
                id,
                name
              )
            )
          )
        `)
        .eq("playlist_id", playlistId!)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as unknown as PlaylistTrack[];
    },
    enabled: !!playlistId,
  });
}
