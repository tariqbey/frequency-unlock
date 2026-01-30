import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mic2, Globe, Music, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const applicationSchema = z.object({
  artistName: z.string().min(2, "Artist name must be at least 2 characters"),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(1000, "Bio must be less than 1000 characters"),
  portfolioUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  sampleTracksUrls: z.string().optional(),
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function ArtistSignup() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: existingApplication, isLoading } = useQuery({
    queryKey: ["artist-application", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("artist_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationSchema),
  });

  const onSubmit = async (data: ApplicationFormData) => {
    if (!user) {
      toast.error("Please sign in to apply");
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);
    try {
      const sampleUrls = data.sampleTracksUrls
        ? data.sampleTracksUrls.split("\n").filter((url) => url.trim())
        : [];

      const { error } = await supabase.from("artist_applications").insert({
        user_id: user.id,
        artist_name: data.artistName,
        bio: data.bio,
        portfolio_url: data.portfolioUrl || null,
        sample_tracks_urls: sampleUrls,
      });

      if (error) throw error;

      toast.success("Application submitted! We'll review it shortly.");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit application");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24">
          <div className="container max-w-2xl py-12">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-bold mb-2">Sign In Required</h2>
                <p className="text-muted-foreground mb-4">
                  You need to sign in before applying to become an artist.
                </p>
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24">
          <div className="container max-w-2xl py-12">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </CardContent>
            </Card>
          </div>
        </main>
      </>
    );
  }

  if (existingApplication) {
    const statusConfig = {
      pending: {
        icon: Clock,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        title: "Application Pending",
        description: "Your artist application is being reviewed. We'll notify you once a decision is made.",
      },
      approved: {
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        title: "Application Approved!",
        description: "Congratulations! You're now an approved artist on 363 Music.",
      },
      rejected: {
        icon: AlertCircle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        title: "Application Not Approved",
        description: existingApplication.rejection_reason || "Unfortunately, your application wasn't approved at this time.",
      },
    };

    const status = statusConfig[existingApplication.status as keyof typeof statusConfig];
    const StatusIcon = status.icon;

    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-24">
          <div className="container max-w-2xl py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`${status.bgColor} border-border/50`}>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <StatusIcon className={`w-16 h-16 ${status.color} mb-4`} />
                  <h2 className="text-2xl font-bold mb-2">{status.title}</h2>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    {status.description}
                  </p>
                  {existingApplication.status === "approved" && (
                    <Button onClick={() => navigate("/artist")}>
                      Go to Artist Dashboard
                    </Button>
                  )}
                  {existingApplication.status === "rejected" && (
                    <p className="text-sm text-muted-foreground mt-4">
                      You may reapply after 30 days.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-24">
        <div className="container max-w-2xl py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Mic2 className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-display text-3xl font-bold mb-2">Become an Artist</h1>
              <p className="text-muted-foreground">
                Join 363 Music and share your music with the world
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Music className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold">Upload Music</h3>
                  <p className="text-sm text-muted-foreground">
                    Share your albums, EPs, and singles
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <Globe className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold">Reach Fans</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with listeners worldwide
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <CheckCircle className="w-8 h-8 text-primary mb-2" />
                  <h3 className="font-semibold">Earn Revenue</h3>
                  <p className="text-sm text-muted-foreground">
                    Receive support from your fans
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Application Form */}
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader>
                <CardTitle>Artist Application</CardTitle>
                <CardDescription>
                  Fill out the form below. Our team will review your application and get back to you soon.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="artistName">Artist / Band Name *</Label>
                    <Input
                      id="artistName"
                      placeholder="Your artist or band name"
                      {...register("artistName")}
                    />
                    {errors.artistName && (
                      <p className="text-sm text-destructive">{errors.artistName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio *</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell us about yourself, your music, and your journey as an artist..."
                      rows={5}
                      {...register("bio")}
                    />
                    {errors.bio && (
                      <p className="text-sm text-destructive">{errors.bio.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="portfolioUrl">Portfolio / Website URL</Label>
                    <Input
                      id="portfolioUrl"
                      type="url"
                      placeholder="https://yourwebsite.com"
                      {...register("portfolioUrl")}
                    />
                    {errors.portfolioUrl && (
                      <p className="text-sm text-destructive">{errors.portfolioUrl.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sampleTracksUrls">Sample Track URLs</Label>
                    <Textarea
                      id="sampleTracksUrls"
                      placeholder="Paste links to your music (one per line)&#10;https://soundcloud.com/...&#10;https://youtube.com/..."
                      rows={3}
                      {...register("sampleTracksUrls")}
                    />
                    <p className="text-xs text-muted-foreground">
                      Links to SoundCloud, YouTube, Bandcamp, or other platforms
                    </p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </>
  );
}
