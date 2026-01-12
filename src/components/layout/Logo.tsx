import { motion } from "framer-motion";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  animated?: boolean;
}

const sizeClasses = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

const taglineSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
};

export function Logo({ size = "md", showTagline = false, animated = true }: LogoProps) {
  const Wrapper = animated ? motion.div : "div";
  
  return (
    <Wrapper
      className="flex flex-col items-center"
      {...(animated && {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 },
      })}
    >
      <div className="flex items-center gap-2">
        {/* 363 Logo Mark */}
        <div className="relative">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <span className="font-display font-bold text-primary-foreground text-sm">3</span>
          </div>
          {animated && (
            <div className="absolute inset-0 rounded-lg bg-gradient-primary opacity-50 blur-lg animate-pulse-glow" />
          )}
        </div>
        
        {/* Brand Name */}
        <h1 className={`font-display font-bold tracking-tight ${sizeClasses[size]}`}>
          <span className="text-gradient">363</span>
          <span className="text-foreground ml-2">Music</span>
        </h1>
      </div>
      
      {showTagline && (
        <p className={`text-muted-foreground mt-2 tracking-wide ${taglineSizes[size]}`}>
          Download the Frequency
        </p>
      )}
    </Wrapper>
  );
}
