import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Heart, Download, Lock, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface DonationBoxProps {
  releaseId: string;
  releaseTitle: string;
  suggestedPriceCents: number | null;
  hasUnlockedDownloads: boolean;
  onDonationSuccess?: () => void;
}

const PRESET_AMOUNTS = [3, 5, 10, 20];

export function DonationBox({
  releaseId,
  releaseTitle,
  suggestedPriceCents,
  hasUnlockedDownloads,
  onDonationSuccess,
}: DonationBoxProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customAmount, setCustomAmount] = useState<string>(
    suggestedPriceCents ? (suggestedPriceCents / 100).toString() : "5"
  );
  const [selectedPreset, setSelectedPreset] = useState<number | null>(5);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePresetClick = (amount: number) => {
    setSelectedPreset(amount);
    setCustomAmount(amount.toString());
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedPreset(null);
  };

  const handleDonate = async () => {
    if (!user) {
      toast.error("Please sign in to donate");
      navigate("/auth");
      return;
    }

    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error("Please enter an amount of at least $1");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-donation-checkout", {
        body: {
          amount_cents: Math.round(amount * 100),
          release_id: releaseId,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Donation error:", error);
      toast.error("Failed to process donation. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (hasUnlockedDownloads) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 text-primary mb-4">
          <Check className="w-6 h-6" />
          <h3 className="font-display text-lg font-semibold">Downloads Unlocked!</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Thank you for your support! You can now download all tracks from this release.
        </p>
        <Button variant="hero" className="w-full gap-2">
          <Download className="w-4 h-4" />
          Download All Tracks
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
          <Heart className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Support the Artist</h3>
          <p className="text-xs text-muted-foreground">Pay what you feel</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Donate any amount to unlock high-quality downloads and support the artist directly.
      </p>

      {/* Preset amounts */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PRESET_AMOUNTS.map((amount) => (
          <Button
            key={amount}
            variant={selectedPreset === amount ? "default" : "outline"}
            size="sm"
            onClick={() => handlePresetClick(amount)}
            className="font-mono"
          >
            ${amount}
          </Button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="relative mb-6">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          $
        </span>
        <Input
          type="number"
          min="1"
          step="0.01"
          value={customAmount}
          onChange={(e) => handleCustomChange(e.target.value)}
          className="pl-7 text-lg font-mono bg-muted/50"
          placeholder="Enter amount"
        />
      </div>

      <Button
        variant="hero"
        className="w-full gap-2"
        size="lg"
        onClick={handleDonate}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Donate & Unlock Downloads
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center mt-4">
        Secure payment powered by Stripe
      </p>
    </motion.div>
  );
}
