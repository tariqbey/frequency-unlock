import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/layout/Logo";
import {
  LayoutDashboard,
  Disc3,
  Music,
  LogOut,
  ChevronLeft,
} from "lucide-react";

interface ArtistLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/artist", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/artist/releases", icon: Disc3, label: "My Releases" },
  { href: "/artist/tracks", icon: Music, label: "My Tracks" },
];

export function ArtistLayout({ children }: ArtistLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Logo size="sm" />
          <p className="mt-2 text-xs text-muted-foreground">Artist Dashboard</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="px-4 py-2 text-sm">
            <p className="text-muted-foreground">Signed in as</p>
            <p className="font-medium truncate">{profile?.display_name || "Artist"}</p>
          </div>
          <Link
            to="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
            Back to Site
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
