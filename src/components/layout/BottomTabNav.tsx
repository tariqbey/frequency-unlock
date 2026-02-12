import { Link, useLocation } from "react-router-dom";
import { Home, Search, Download, Library } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/library", label: "Search", icon: Search },
  { href: "/downloads", label: "Downloads", icon: Download },
  { href: "/playlists", label: "Library", icon: Library },
];

export function BottomTabNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-card/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={`flex flex-col items-center gap-1 px-4 py-2 text-xs transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
