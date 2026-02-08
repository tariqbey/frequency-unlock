import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/Logo";
import { FeaturedArtistCarousel } from "@/components/home/FeaturedArtistCarousel";
import { Radio, Headphones, Download, Music2 } from "lucide-react";
import { useEffect, useRef } from "react";
const features = [
  {
    icon: Music2,
    title: "Stream Releases",
    description: "Access exclusive music from independent artists",
  },
  {
    icon: Headphones,
    title: "Behind the Frequency",
    description: "Read artist commentary on what each track means",
  },
  {
    icon: Download,
    title: "Pay What You Feel",
    description: "Donate any amount to unlock high-quality downloads",
  },
];

export default function Index() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force play on mobile - browsers often block autoplay
    const playVideo = async () => {
      try {
        await video.play();
      } catch (e) {
        // If autoplay fails, try on first user interaction
        const handleInteraction = async () => {
          try {
            await video.play();
            document.removeEventListener('touchstart', handleInteraction);
            document.removeEventListener('click', handleInteraction);
          } catch (err) {
            console.log('Video play failed:', err);
          }
        };
        document.addEventListener('touchstart', handleInteraction, { once: true });
        document.addEventListener('click', handleInteraction, { once: true });
      }
    };

    // Try to play immediately
    playVideo();

    // Also try when video is ready
    video.addEventListener('canplay', playVideo);
    
    return () => {
      video.removeEventListener('canplay', playVideo);
    };
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background Video - no controls, auto-loops silently */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        className="fixed top-0 left-0 w-full h-screen object-cover pointer-events-none select-none"
        style={{ zIndex: 0 }}
      >
        <source src="/videos/hero-background.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay for hero section - also fixed */}
      <div className="fixed top-0 left-0 w-full h-screen bg-background/60" style={{ zIndex: 1 }} />

      {/* Video Hero Section */}
      <section className="relative h-screen w-full overflow-hidden" style={{ zIndex: 2 }}>

        {/* Navigation */}
        <nav className="absolute top-0 left-0 right-0 z-20 px-6 py-4 md:px-12">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <Logo size="md" />
            <div className="hidden md:flex items-center gap-8">
              <Link to="/library" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                Library
              </Link>
              <Link to="/radio" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                Radio
              </Link>
              <Link to="/forum" className="text-foreground/80 hover:text-foreground transition-colors font-medium">
                Community
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="hidden sm:block text-foreground/80 hover:text-foreground transition-colors font-medium">
                Log in
              </Link>
              <Button variant="hero" size="lg" asChild>
                <Link to="/auth?mode=signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
            <motion.div
              className="max-w-3xl"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold text-foreground leading-[0.95] tracking-tight">
                The ultimate
                <br />
                home for
                <br />
                <span className="text-gradient italic">artists</span>
              </h1>

              <motion.div
                className="mt-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <Button variant="hero" size="xl" asChild>
                  <Link to="/library" className="flex items-center gap-3">
                    <Radio className="w-5 h-5" />
                    Enter the Frequency
                  </Link>
                </Button>
                <p className="mt-4 text-sm text-muted-foreground">
                  Free to stream. <Link to="/auth" className="underline hover:text-foreground">Terms apply.</Link>
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>

      </section>

      {/* Mission Statement Section */}
      <section className="relative py-32 px-6 md:px-12 bg-background" style={{ zIndex: 2 }}>
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight italic">
            As the home for independent music, 363 Music is where fans and artists come together.
          </h2>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl">
            It's the place to discover the perfect song for the moment. The place that brings music to your whole life.
          </p>
        </motion.div>
      </section>

      {/* Featured Artists Section */}
      <section className="relative py-24 px-6 md:px-12 bg-primary" style={{ zIndex: 2 }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold text-primary-foreground">
              Take us with you anywhere
            </h2>
            <p className="mt-4 text-primary-foreground/80 max-w-xl text-lg">
              One of the world's most authentic music platforms, connecting artists directly with fans.
            </p>
          </motion.div>

          <FeaturedArtistCarousel />
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-6 md:px-12 bg-background" style={{ zIndex: 2 }}>
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-display text-3xl md:text-5xl font-bold">
              How It <span className="text-gradient">Works</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">
              Connect directly with artists and support their work on your terms
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="glass-card p-8 text-center group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 md:px-12 bg-muted/30" style={{ zIndex: 2 }}>
        <motion.div
          className="max-w-2xl mx-auto text-center relative z-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl md:text-5xl font-bold mb-6">
            Ready to <span className="text-gradient">Download the Frequency</span>?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join our community of music lovers and independent artists today.
          </p>
          <Button variant="hero" size="xl" asChild>
            <Link to="/auth?mode=signup">Get Started Free</Link>
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/50 py-8 px-6 md:px-12 bg-background" style={{ zIndex: 2 }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            © 2024 363 Music. Download the Frequency.
          </p>
        </div>
      </footer>
    </div>
  );
}
