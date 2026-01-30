import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, Music, Radio, MessageSquare, User, Settings, LogOut, Shield, Disc3, Download } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "./Logo";

const navLinks = [
  { href: "/library", label: "Library", icon: Music },
  { href: "/radio", label: "Radio", icon: Radio },
  { href: "/forum", label: "Forum", icon: MessageSquare },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, profile, signOut, isAdmin, isArtist } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] bg-background/95 backdrop-blur-xl border-r border-border/50 p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-border/50">
            <Link to="/" onClick={() => setOpen(false)}>
              <Logo size="sm" />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navLinks.map((link, index) => {
              const Icon = link.icon;
              const isActive = location.pathname.startsWith(link.href);
              return (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={link.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border/50 space-y-1">
            {user ? (
              <>
                <div className="px-4 py-2 mb-2">
                  <p className="text-sm font-medium">{profile?.display_name || user.email?.split("@")[0]}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <User className="w-5 h-5" />
                  Profile
                </Link>
                <Link
                  to="/downloads"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Download className="w-5 h-5" />
                  My Downloads
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <Settings className="w-5 h-5" />
                  Settings
                </Link>
                {isArtist && (
                  <Link
                    to="/artist"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Disc3 className="w-5 h-5" />
                    Artist Dashboard
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <Shield className="w-5 h-5" />
                    Admin Panel
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-destructive hover:bg-destructive/10 w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <Link to="/auth" onClick={() => setOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?mode=signup" onClick={() => setOpen(false)}>
                  <Button variant="hero" className="w-full">
                    Join 363 Music
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
