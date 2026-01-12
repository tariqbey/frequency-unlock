import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  changeValue?: number;
  icon: ReactNode;
  delay?: number;
  sparklineData?: number[];
  gradient?: string;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  changeValue,
  icon,
  delay = 0,
  sparklineData,
  gradient,
}: StatsCardProps) {
  // Generate sparkline path
  const generateSparkline = (data: number[]) => {
    if (!data || data.length < 2) return "";
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 24;
    const step = width / (data.length - 1);
    
    const points = data.map((val, i) => {
      const x = i * step;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    });
    
    return `M${points.join(" L")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 100 }}
      className={cn(
        "relative overflow-hidden rounded-xl p-6 transition-all hover:scale-[1.02] hover:shadow-lg",
        gradient ? `bg-gradient-to-br ${gradient}` : "glass-panel"
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-primary/5 blur-3xl" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className={cn(
            "text-sm font-medium",
            gradient ? "text-white/70" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <p className={cn(
              "font-display text-3xl font-bold tracking-tight",
              gradient && "text-white"
            )}>
              {value}
            </p>
            {changeValue !== undefined && (
              <div className={cn(
                "flex items-center gap-0.5 text-xs font-medium",
                changeType === "positive" && "text-emerald-500",
                changeType === "negative" && "text-red-500",
                changeType === "neutral" && (gradient ? "text-white/50" : "text-muted-foreground")
              )}>
                {changeType === "positive" && <TrendingUp className="h-3 w-3" />}
                {changeType === "negative" && <TrendingDown className="h-3 w-3" />}
                {changeType === "neutral" && <Minus className="h-3 w-3" />}
                <span>{changeValue > 0 ? "+" : ""}{changeValue}%</span>
              </div>
            )}
          </div>
          {change && (
            <p className={cn(
              "text-xs",
              gradient ? "text-white/50" : "text-muted-foreground"
            )}>
              {change}
            </p>
          )}
        </div>
        
        <div className={cn(
          "flex flex-col items-end gap-3",
        )}>
          <div className={cn(
            "rounded-xl p-3",
            gradient ? "bg-white/20" : "bg-primary/10"
          )}>
            <div className={gradient ? "text-white" : "text-primary"}>
              {icon}
            </div>
          </div>
          
          {/* Sparkline */}
          {sparklineData && sparklineData.length > 1 && (
            <svg 
              width="80" 
              height="24" 
              className="opacity-60"
              viewBox="0 0 80 24"
            >
              <path
                d={generateSparkline(sparklineData)}
                fill="none"
                stroke={gradient ? "rgba(255,255,255,0.6)" : "hsl(var(--primary))"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </motion.div>
  );
}
