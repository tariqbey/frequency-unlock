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
import { lovable } from "@/integrations/lovable";
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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-muted" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              disabled={isGoogleLoading}
              onClick={async () => {
                setIsGoogleLoading(true);
                try {
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) {
                    toast.error(error.message);
                  }
                } catch (err) {
                  toast.error("Failed to sign in with Google");
                } finally {
                  setIsGoogleLoading(false);
                }
              }}
            >
              {isGoogleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>

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
