import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Headphones, Mic2 } from "lucide-react";

const authSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  displayName: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [accountType, setAccountType] = useState<"listener" | "artist">("listener");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  useEffect(() => {
    if (user) {
      navigate("/library");
    }
  }, [user, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(data.email, data.password, data.displayName);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Account created! Please check your email to verify.");
          // If artist, redirect to artist signup after verification
          if (accountType === "artist") {
            toast.info("After verifying your email, you can apply to become an artist.");
            navigate("/artist-signup");
          } else {
            navigate("/library");
          }
        }
      } else {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Welcome back!");
          navigate("/library");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen hero-gradient flex flex-col">
      {/* Back button */}
      <div className="container pt-6">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </Button>
      </div>

      {/* Auth form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <Logo size="lg" animated />
            <h1 className="mt-6 font-display text-2xl font-bold">
              {isSignUp ? "Join the Frequency" : "Welcome Back"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isSignUp
                ? "Create your account to start streaming"
                : "Sign in to continue your journey"}
            </p>
          </div>

          <div className="glass-card p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {isSignUp && (
                <>
                  {/* Account Type Selection */}
                  <div className="space-y-3">
                    <Label>I am a...</Label>
                    <RadioGroup
                      value={accountType}
                      onValueChange={(value) => setAccountType(value as "listener" | "artist")}
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem
                          value="listener"
                          id="listener"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="listener"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-muted/30 p-4 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                        >
                          <Headphones className="w-8 h-8 mb-2" />
                          <span className="font-medium">Listener</span>
                          <span className="text-xs text-muted-foreground mt-1">
                            Stream & discover
                          </span>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem
                          value="artist"
                          id="artist"
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor="artist"
                          className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-muted/30 p-4 hover:bg-muted/50 hover:border-primary/50 cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                        >
                          <Mic2 className="w-8 h-8 mb-2" />
                          <span className="font-medium">Artist</span>
                          <span className="text-xs text-muted-foreground mt-1">
                            Share your music
                          </span>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Your name"
                      {...register("displayName")}
                      className="bg-muted/50"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="bg-muted/50"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="bg-muted/50"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSignUp ? (
                  accountType === "artist" ? "Create Account & Apply as Artist" : "Create Account"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
