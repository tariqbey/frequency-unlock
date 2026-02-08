import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Share, Plus, MoreVertical, Download } from "lucide-react";

const STORAGE_KEY = "pwa-install-prompt";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PromptState {
  dismissedForever: boolean;
  dismissedUntil: number | null;
}

function getPromptState(): PromptState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return { dismissedForever: false, dismissedUntil: null };
}

function setPromptState(state: PromptState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

function isMobileDevice(): boolean {
  return isIOS() || isAndroid() || /webOS|BlackBerry|Opera Mini|IEMobile/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  // Check if already running as installed PWA
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function MobileInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if not mobile, already standalone, or user dismissed
    if (!isMobileDevice() || isStandalone()) {
      return;
    }

    const state = getPromptState();
    if (state.dismissedForever) {
      return;
    }
    if (state.dismissedUntil && Date.now() < state.dismissedUntil) {
      return;
    }

    // Show prompt after a short delay for better UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    // Listen for beforeinstallprompt (Android Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleDismiss24h = () => {
    setPromptState({
      dismissedForever: false,
      dismissedUntil: Date.now() + DISMISS_DURATION_MS,
    });
    setIsVisible(false);
  };

  const handleDismissForever = () => {
    setPromptState({
      dismissedForever: true,
      dismissedUntil: null,
    });
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android: trigger native install prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        handleDismissForever();
      }
      setDeferredPrompt(null);
    }
  };

  if (!isVisible) return null;

  const iosDevice = isIOS();
  const androidDevice = isAndroid();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-0 left-0 right-0 z-[200] p-4 safe-area-bottom"
      >
        <div className="glass-card p-5 rounded-2xl border border-primary/30 shadow-2xl max-w-md mx-auto">
          {/* Close button */}
          <button
            onClick={handleDismiss24h}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex items-start gap-4">
            {/* App icon */}
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="w-7 h-7 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-lg">Install 363 Music</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add to your home screen for the best experience
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-2">
            {iosDevice ? (
              <>
                <p className="text-sm font-medium">How to install on iOS:</p>
                <ol className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                    Tap the <Share className="w-4 h-4 inline mx-1" /> Share button below
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                    Scroll and tap <Plus className="w-4 h-4 inline mx-1" /> "Add to Home Screen"
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
                    Tap "Add" to confirm
                  </li>
                </ol>
              </>
            ) : androidDevice ? (
              <>
                <p className="text-sm font-medium">How to install on Android:</p>
                {deferredPrompt ? (
                  <Button
                    onClick={handleInstallClick}
                    variant="hero"
                    className="w-full mt-2"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Install App
                  </Button>
                ) : (
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">1</span>
                      Tap the <MoreVertical className="w-4 h-4 inline mx-1" /> menu (3 dots)
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">2</span>
                      Tap "Add to Home screen" or "Install app"
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">3</span>
                      Tap "Add" or "Install" to confirm
                    </li>
                  </ol>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Use your browser's menu to add this app to your home screen.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-4 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismissForever}
              className="flex-1 text-muted-foreground"
            >
              Don't show again
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss24h}
              className="flex-1"
            >
              Remind me later
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
