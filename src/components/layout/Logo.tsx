import { motion } from "framer-motion";
import logoImage from "@/assets/363-music-logo-transparent.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
  showTagline?: boolean;
  animated?: boolean;
}

// Logo sizes (kept conservative for navbar + responsive layouts)
const imageSizes = {
  sm: "h-10 w-10",      // ~40px
  md: "h-12 w-12",      // ~48px
  lg: "h-16 w-16",      // ~64px
  xl: "h-24 w-24",      // ~96px
  xxl: "h-32 w-32",     // ~128px
};

const taglineSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-xl",
  xxl: "text-2xl",
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
      <img 
        src={logoImage} 
        alt="363 Music" 
        className={`${imageSizes[size]} object-contain`}
      />
      
      {showTagline && (
        <p className={`text-muted-foreground mt-2 tracking-wide ${taglineSizes[size]}`}>
          Download the Frequency
        </p>
      )}
    </Wrapper>
  );
}
