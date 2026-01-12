import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User,
  Bell,
  Shield,
  Disc3,
  ChevronRight,
  Mail,
  Lock,
  Palette,
  Volume2,
  Eye,
  EyeOff,
} from "lucide-react";

export default function Settings() {
  const { user, profile, isAdmin, isArtist, loading } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [isSaving, setIsSaving] = useState(false);

  // Password change state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newReleaseAlerts, setNewReleaseAlerts] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleSaveProfile = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("user_id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (password.length > 72) {
      return "Password must be less than 72 characters";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter";
    }
    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number";
    }
    return null;
  };

  const handleChangePassword = async () => {
    setPasswordError("");

    // Validate new password
    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast.success("Password changed successfully");
      setPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setPasswordError(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const resetPasswordDialog = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />

      <main className="container max-w-3xl pt-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="font-display text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground mb-8">
            Manage your account settings and preferences
          </p>

          {/* Quick Access Links for Artist/Admin */}
          {(isArtist || isAdmin) && (
            <div className="glass-card p-4 mb-8">
              <h2 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Quick Access
              </h2>
              <div className="space-y-2">
                {isArtist && (
                  <Link
                    to="/artist"
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Disc3 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Artist Dashboard</p>
                        <p className="text-sm text-muted-foreground">
                          Manage your releases and tracks
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium">Admin Panel</p>
                        <p className="text-sm text-muted-foreground">
                          Manage users, content, and platform settings
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Account Settings */}
          <div className="glass-card p-6 mb-6">
            <h2 className="font-display font-semibold mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Account Settings
            </h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Display Name
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                  <Button onClick={handleSaveProfile} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <Dialog 
                  open={passwordDialogOpen} 
                  onOpenChange={(open) => {
                    setPasswordDialogOpen(open);
                    if (!open) resetPasswordDialog();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your new password below. Password must be at least 8 characters with uppercase, lowercase, and a number.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <div className="relative">
                          <Input
                            id="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            maxLength={72}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                            maxLength={72}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      {passwordError && (
                        <p className="text-sm text-destructive">{passwordError}</p>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setPasswordDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !newPassword || !confirmPassword}
                      >
                        {isChangingPassword ? "Changing..." : "Change Password"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="glass-card p-6 mb-6">
            <h2 className="font-display font-semibold mb-6 flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive updates about your account via email
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="newReleaseAlerts">New Release Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when artists you follow release new music
                  </p>
                </div>
                <Switch
                  id="newReleaseAlerts"
                  checked={newReleaseAlerts}
                  onCheckedChange={setNewReleaseAlerts}
                />
              </div>
            </div>
          </div>

          {/* Playback Preferences */}
          <div className="glass-card p-6 mb-6">
            <h2 className="font-display font-semibold mb-6 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Playback Preferences
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoPlay">Auto-Play</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically play the next track in queue
                  </p>
                </div>
                <Switch
                  id="autoPlay"
                  checked={autoPlay}
                  onCheckedChange={setAutoPlay}
                />
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="glass-card p-6">
            <h2 className="font-display font-semibold mb-6 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Appearance
            </h2>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Theme customization coming soon. Currently using system default.
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
