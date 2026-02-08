import { motion, AnimatePresence } from "framer-motion";
import logoImage from "@/assets/363-music-logo-transparent.png";

interface SplashScreenProps {
  isVisible: boolean;
  onAnimationComplete: () => void;
}

export function SplashScreen({ isVisible, onAnimationComplete }: SplashScreenProps) {
  return (
    <AnimatePresence onExitComplete={onAnimationComplete}>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {/* Glowing background effect */}
            <motion.div
              className="absolute w-80 h-80 rounded-full bg-primary/20 blur-3xl"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1.5 }}
              transition={{ duration: 1.2, delay: 0.2 }}
            />
            
            {/* Logo with pulse animation */}
            <motion.img
              src={logoImage}
              alt="363 Music"
              className="h-40 w-40 sm:h-52 sm:w-52 md:h-60 md:w-60 object-contain relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
              }}
            />
            
            {/* Tagline */}
            <motion.p
              className="mt-6 text-xl text-muted-foreground tracking-widest font-display"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Download the Frequency
            </motion.p>
            
            {/* Loading bar */}
            <motion.div
              className="mt-8 h-1 w-48 rounded-full bg-muted overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.2, delay: 0.7, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
