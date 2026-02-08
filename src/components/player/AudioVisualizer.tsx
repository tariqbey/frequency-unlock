import { useRef, useEffect, useState } from "react";
import { usePlayer } from "@/contexts/PlayerContext";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AudioVisualizerProps {
  barCount?: number;
  className?: string;
  variant?: "bars" | "wave" | "dots" | "circular" | "pulse";
}

export function AudioVisualizer({ 
  barCount = 20, 
  className = "",
  variant = "bars"
}: AudioVisualizerProps) {
  const { analyser, isPlaying } = usePlayer();
  const [bars, setBars] = useState<number[]>(new Array(barCount).fill(0));
  const [avgLevel, setAvgLevel] = useState(0);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser) {
      // If no analyser, show animated placeholder bars when playing
      if (isPlaying) {
        const interval = setInterval(() => {
          const randomBars = Array.from({ length: barCount }, () => Math.random() * 100);
          setBars(randomBars);
          setAvgLevel(randomBars.reduce((a, b) => a + b, 0) / barCount);
        }, 100);
        return () => clearInterval(interval);
      } else {
        setBars(new Array(barCount).fill(10));
        setAvgLevel(10);
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
      let totalLevel = 0;
      
      for (let i = 0; i < barCount; i++) {
        const index = i * step;
        const value = dataArray[index] || 0;
        // Normalize to 0-100
        const normalized = (value / 255) * 100;
        newBars.push(normalized);
        totalLevel += normalized;
      }

      setBars(newBars);
      setAvgLevel(totalLevel / barCount);
      animationRef.current = requestAnimationFrame(animate);
    };

    if (isPlaying) {
      animate();
    } else {
      setBars(new Array(barCount).fill(10));
      setAvgLevel(10);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, barCount]);

  // Circular pulsing visualizer
  if (variant === "circular") {
    return (
      <div className={cn("relative flex items-center justify-center", className)}>
        {/* Outer pulse rings */}
        {[0, 1, 2].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border-2 border-primary/30"
            animate={{
              width: isPlaying ? `${100 + avgLevel * 0.8 + ring * 30}%` : "100%",
              height: isPlaying ? `${100 + avgLevel * 0.8 + ring * 30}%` : "100%",
              opacity: isPlaying ? 0.4 - ring * 0.1 : 0.1,
            }}
            transition={{ duration: 0.1 }}
          />
        ))}
        {/* Center glow */}
        <motion.div
          className="absolute rounded-full bg-primary/20 blur-xl"
          animate={{
            width: isPlaying ? `${80 + avgLevel * 0.5}%` : "60%",
            height: isPlaying ? `${80 + avgLevel * 0.5}%` : "60%",
            opacity: isPlaying ? 0.5 + avgLevel / 200 : 0.2,
          }}
          transition={{ duration: 0.1 }}
        />
      </div>
    );
  }

  // Pulsing background effect
  if (variant === "pulse") {
    return (
      <motion.div
        className={cn("absolute inset-0 bg-primary/10 rounded-full blur-3xl", className)}
        animate={{
          scale: isPlaying ? 1 + avgLevel / 150 : 1,
          opacity: isPlaying ? 0.2 + avgLevel / 300 : 0.1,
        }}
        transition={{ duration: 0.1 }}
      />
    );
  }

  if (variant === "dots") {
    return (
      <div className={cn("flex items-center justify-center gap-1", className)}>
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
      <div className={cn("flex items-end justify-center gap-0.5 h-full", className)}>
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
    <div className={cn("flex items-end justify-center gap-1 h-full", className)}>
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
