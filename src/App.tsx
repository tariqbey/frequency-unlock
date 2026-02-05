import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PlayerProvider } from "@/contexts/PlayerContext";
import { FullAlbumListenProvider } from "@/hooks/useFullAlbumListen";
import { MiniPlayer } from "@/components/player/MiniPlayer";
import { FullPlayer } from "@/components/player/FullPlayer";
import { SplashScreen } from "@/components/layout/SplashScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Library from "./pages/Library";
import Release from "./pages/Release";
import ArtistProfile from "./pages/ArtistProfile";
import UserProfile from "./pages/UserProfile";
import Downloads from "./pages/Downloads";
import ForumPage from "./pages/Forum";
import ForumNewThread from "./pages/ForumNewThread";
import ForumThread from "./pages/ForumThread";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminArtists from "./pages/admin/AdminArtists";
import AdminReleases from "./pages/admin/AdminReleases";
import AdminTracks from "./pages/admin/AdminTracks";
import AdminRadio from "./pages/admin/AdminRadio";
import AdminDonations from "./pages/admin/AdminDonations";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminApplications from "./pages/admin/AdminApplications";
import ArtistDashboard from "./pages/artist/ArtistDashboard";
import ArtistReleases from "./pages/artist/ArtistReleases";
import ArtistTracks from "./pages/artist/ArtistTracks";
import ArtistSignup from "./pages/ArtistSignup";
import Settings from "./pages/Settings";
import Radio from "./pages/Radio";
import Playlists from "./pages/Playlists";
import PlaylistDetail from "./pages/PlaylistDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
    },
  },
});

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, loading } = useAuth();
  
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function ArtistRoute({ children }: { children: React.ReactNode }) {
  const { isArtist, isAdmin, loading } = useAuth();
  
  if (loading) return null;
  // Allow admins and artists to access artist routes
  if (!isArtist && !isAdmin) return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    // Hide splash after animation
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SplashScreen 
        isVisible={showSplash} 
        onAnimationComplete={() => setSplashComplete(true)} 
      />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/library" element={<Library />} />
          <Route path="/release/:id" element={<Release />} />
          <Route path="/artist/:id" element={<ArtistProfile />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/radio" element={<Radio />} />
          <Route path="/playlists" element={<Playlists />} />
          <Route path="/playlist/:id" element={<PlaylistDetail />} />
          <Route path="/forum" element={<ForumPage />} />
          <Route path="/forum/new" element={<ForumNewThread />} />
          <Route path="/forum/thread/:id" element={<ForumThread />} />
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          <Route path="/admin/applications" element={<AdminRoute><AdminApplications /></AdminRoute>} />
          <Route path="/admin/artists" element={<AdminRoute><AdminArtists /></AdminRoute>} />
          <Route path="/admin/releases" element={<AdminRoute><AdminReleases /></AdminRoute>} />
          <Route path="/admin/tracks" element={<AdminRoute><AdminTracks /></AdminRoute>} />
          <Route path="/admin/radio" element={<AdminRoute><AdminRadio /></AdminRoute>} />
          <Route path="/admin/donations" element={<AdminRoute><AdminDonations /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
          <Route path="/artist" element={<ArtistRoute><ArtistDashboard /></ArtistRoute>} />
          <Route path="/artist/releases" element={<ArtistRoute><ArtistReleases /></ArtistRoute>} />
          <Route path="/artist/tracks" element={<ArtistRoute><ArtistTracks /></ArtistRoute>} />
          <Route path="/artist-signup" element={<ArtistSignup />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <MiniPlayer />
      <FullPlayer />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PlayerProvider>
        <FullAlbumListenProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </FullAlbumListenProvider>
      </PlayerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
