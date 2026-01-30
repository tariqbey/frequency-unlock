import { useRef, useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { motion } from "framer-motion";

interface AudioVisualizerProps {
  barCount?: number;
  className?: string;
  variant?: "bars" | "wave" | "dots";
}

export function AudioVisualizer({ 
  barCount = 20, 
  className = "",
  variant = "bars"
}: AudioVisualizerProps) {
  const { analyser, isPlaying } = usePlayer();
  const [bars, setBars] = useState<number[]>(new Array(barCount).fill(0));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser) {
      // If no analyser, show animated placeholder bars when playing
      if (isPlaying) {
        const interval = setInterval(() => {
          setBars(prev => prev.map(() => Math.random() * 100));
        }, 100);
        return () => clearInterval(interval);
      } else {
        setBars(new Array(barCount).fill(10));
      }
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const animate = () => {
      if (!analyser) return;

      analyser.getByteFrequencyData(dataArray);

      // Sample bars evenly across frequency spectrum
      const newBars: number[] = [];
      const step = Math.floor(bufferLength / barCount);
      
      for (let i = 0; i < barCount; i++) {
        const index = i * step;
        const value = dataArray[index] || 0;
        // Normalize to 0-100
        newBars.push((value / 255) * 100);
      }

      setBars(newBars);
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animate();
    } else {
      setBars(new Array(barCount).fill(10));
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, barCount]);

  if (variant === "dots") {
    return (
      <div className={`flex items-center justify-center gap-1 ${className}`}>
        {bars.slice(0, 5).map((height, index) => (
          <motion.div
            key={index}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{
              scale: isPlaying ? 0.5 + (height / 100) : 0.5,
              opacity: isPlaying ? 0.5 + (height / 200) : 0.3,
            }}
            transition={{ duration: 0.1 }}
          />
        ))}
      </div>
    );
  }

  if (variant === "wave") {
    return (
      <div className={`flex items-end justify-center gap-0.5 h-full ${className}`}>
        {bars.map((height, index) => (
          <motion.div
            key={index}
            className="w-1 bg-gradient-to-t from-primary to-primary/50 rounded-full"
            style={{ minHeight: 4 }}
            animate={{
              height: isPlaying ? `${Math.max(height, 10)}%` : "10%",
            }}
            transition={{
              duration: 0.05,
              ease: "linear",
            }}
          />
        ))}
      </div>
    );
  }

  // Default: bars
  return (
    <div className={`flex items-end justify-center gap-1 h-full ${className}`}>
      {bars.map((height, index) => (
        <motion.div
          key={index}
          className="flex-1 max-w-2 bg-gradient-to-t from-primary via-primary/80 to-primary/40 rounded-t-sm"
          style={{ minHeight: 4 }}
          animate={{
            height: isPlaying ? `${Math.max(height, 5)}%` : "5%",
          }}
          transition={{
            duration: 0.08,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
