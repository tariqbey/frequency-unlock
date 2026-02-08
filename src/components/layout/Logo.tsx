import { motion } from "framer-motion";
import logoImage from "@/assets/363-music-logo-transparent.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
  showTagline?: boolean;
  animated?: boolean;
}

// Logo sizes - 2.5 inches = ~240px at 96 DPI
const imageSizes = {
  sm: "h-16 w-16",      // ~64px
  md: "h-20 w-20",      // ~80px  
  lg: "h-24 w-24",      // ~96px (~1 inch)
  xl: "h-48 w-48",      // ~192px (2 inches)
  xxl: "h-60 w-60",     // ~240px (2.5 inches)
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
