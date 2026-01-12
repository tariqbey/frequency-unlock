import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: ReactNode;
  delay?: number;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-panel p-6 rounded-xl"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-2 font-display text-3xl font-bold">{value}</p>
          {change && (
            <p
              className={cn(
                "mt-1 text-sm",
                changeType === "positive" && "text-green-400",
                changeType === "negative" && "text-red-400",
                changeType === "neutral" && "text-muted-foreground"
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="p-3 rounded-lg bg-primary/10 text-primary">{icon}</div>
      </div>
    </motion.div>
  );
}
