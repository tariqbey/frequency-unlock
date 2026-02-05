import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Music, MessageSquare, Shield, Download, Disc3, Radio, Mic2, ListMusic } from "lucide-react";

const navLinks = [
  { href: "/library", label: "Library", icon: Music },
  { href: "/playlists", label: "Playlists", icon: ListMusic },
  { href: "/radio", label: "Radio", icon: Radio },
  { href: "/forum", label: "Forum", icon: MessageSquare },
];

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut, isAdmin, isArtist } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container flex h-20 items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Mobile Menu */}
          <MobileMenu />
          
          <Link to="/" className="flex items-center">
            <Logo size="xxl" />
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`nav-link flex items-center gap-2 ${isActive ? "active" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="glass" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {profile?.display_name || user.email?.split("@")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/downloads")}>
                  <Download className="w-4 h-4" />
                  My Downloads
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onClick={() => navigate("/settings")}>
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenuItem>
                {isArtist && (
                  <DropdownMenuItem 
                    className="gap-2"
                    onClick={() => navigate("/artist")}
                  >
                    <Disc3 className="w-4 h-4" />
                    Artist Dashboard
                  </DropdownMenuItem>
                )}
                {isAdmin && (
                  <DropdownMenuItem 
                    className="gap-2"
                    onClick={() => navigate("/admin")}
                  >
                    <Shield className="w-4 h-4" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive">
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                <Link to="/artist-signup" className="gap-2">
                  <Mic2 className="w-4 h-4" />
                  For Artists
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/auth?mode=signup">Join</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.header>
  );
}
