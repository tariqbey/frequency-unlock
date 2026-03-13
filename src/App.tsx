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
import { MobileInstallPrompt } from "@/components/pwa/MobileInstallPrompt";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}

function AppContent() {
  const [showSplash, setShowSplash] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = window.innerWidth < 768;
    setIsMobile(checkMobile);
    
    if (checkMobile) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      {isMobile && (
        <SplashScreen 
          isVisible={showSplash} 
          onAnimationComplete={() => setSplashComplete(true)} 
        />
      )}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/library" element={<ProtectedRoute><Library /></ProtectedRoute>} />
          <Route path="/release/:id" element={<ProtectedRoute><Release /></ProtectedRoute>} />
          <Route path="/artist/:id" element={<ProtectedRoute><ArtistProfile /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/downloads" element={<ProtectedRoute><Downloads /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/radio" element={<ProtectedRoute><Radio /></ProtectedRoute>} />
          <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
          <Route path="/playlist/:id" element={<ProtectedRoute><PlaylistDetail /></ProtectedRoute>} />
          <Route path="/forum" element={<ProtectedRoute><ForumPage /></ProtectedRoute>} />
          <Route path="/forum/new" element={<ProtectedRoute><ForumNewThread /></ProtectedRoute>} />
          <Route path="/forum/thread/:id" element={<ProtectedRoute><ForumThread /></ProtectedRoute>} />
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
      <MobileInstallPrompt />
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
