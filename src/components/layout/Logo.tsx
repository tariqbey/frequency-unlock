import { motion } from "framer-motion";
import logoImage from "@/assets/363-music-logo.png";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  animated?: boolean;
}

// Logo sizes - sm increased to ~1 inch (96px) for navbar
const imageSizes = {
  sm: "h-16 w-16",      // ~64px - slightly larger for nav
  md: "h-20 w-20",      // ~80px  
  lg: "h-24 w-24",      // ~96px (~1 inch)
  xl: "h-48 w-48",      // ~192px (2 inches)
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
