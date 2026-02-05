import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  Trash2,
  AlertTriangle,
} from "lucide-react";
 import { PushNotificationSettings } from "@/components/settings/PushNotificationSettings";

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, roles, isAdmin, isArtist, isModerator, loading, signOut } = useAuth();
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

  // Email change state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Account deletion state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Preferences state
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newReleaseAlerts, setNewReleaseAlerts] = useState(true);
  const [autoPlay, setAutoPlay] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "Admin", className: "bg-destructive/10 text-destructive border-destructive/20" };
      case "artist":
        return { label: "Artist", className: "bg-primary/10 text-primary border-primary/20" };
      case "moderator":
        return { label: "Moderator", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" };
      default:
        return { label: "Listener", className: "bg-muted text-muted-foreground border-border" };
    }
  };

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

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return "Email is required";
    }
    if (email.length > 255) {
      return "Email must be less than 255 characters";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    if (email.toLowerCase() === user?.email?.toLowerCase()) {
      return "New email must be different from current email";
    }
    return null;
  };

  const handleChangeEmail = async () => {
    setEmailError("");

    const validationError = validateEmail(newEmail);
    if (validationError) {
      setEmailError(validationError);
      return;
    }

    setIsChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (error) throw error;

      toast.success("Confirmation email sent! Please check your new email inbox to confirm the change.");
      setEmailDialogOpen(false);
      setNewEmail("");
    } catch (error: any) {
      setEmailError(error.message || "Failed to change email");
    } finally {
      setIsChangingEmail(false);
    }
  };

  const resetEmailDialog = () => {
    setNewEmail("");
    setEmailError("");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE MY ACCOUNT") {
      toast.error("Please type 'DELETE MY ACCOUNT' to confirm");
      return;
    }

    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("delete-account", {
        body: { confirmation: deleteConfirmation },
      });

      if (response.error) throw response.error;

      await signOut();
      toast.success("Your account has been deleted");
      navigate("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast.error(error.message || "Failed to delete account");
    } finally {
      setIsDeleting(false);
    }
  };

  const resetDeleteDialog = () => {
    setDeleteConfirmation("");
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <Navbar />

      <main className="container max-w-3xl pt-24 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="font-display text-3xl font-bold">Settings</h1>
            {roles.length > 0 ? (
              roles.map((r) => {
                const badge = getRoleBadge(r.role);
                return (
                  <Badge key={r.role} variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                );
              })
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
                Listener
              </Badge>
            )}
          </div>
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
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted/50 flex-1"
                  />
                  <Dialog 
                    open={emailDialogOpen} 
                    onOpenChange={(open) => {
                      setEmailDialogOpen(open);
                      if (!open) resetEmailDialog();
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button variant="outline">Change</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Change Email Address</DialogTitle>
                        <DialogDescription>
                          Enter your new email address. A confirmation link will be sent to verify the change.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentEmail">Current Email</Label>
                          <Input
                            id="currentEmail"
                            type="email"
                            value={user.email || ""}
                            disabled
                            className="bg-muted/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newEmail">New Email</Label>
                          <Input
                            id="newEmail"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="Enter new email address"
                            maxLength={255}
                          />
                        </div>
                        {emailError && (
                          <p className="text-sm text-destructive">{emailError}</p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setEmailDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleChangeEmail}
                          disabled={isChangingEmail || !newEmail}
                        >
                          {isChangingEmail ? "Sending..." : "Send Confirmation"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
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
               {/* Push Notifications */}
               <PushNotificationSettings />
 
               <Separator />
 
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
          <div className="glass-card p-6 mb-6">
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

          {/* Danger Zone */}
          <div className="glass-card p-6 border-destructive/50">
            <h2 className="font-display font-semibold mb-6 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Danger Zone
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="font-medium">Delete Account</p>
                  <p className="text-sm text-muted-foreground">
                    Permanently delete your account and all associated data
                  </p>
                </div>
                <Dialog 
                  open={deleteDialogOpen} 
                  onOpenChange={(open) => {
                    setDeleteDialogOpen(open);
                    if (!open) resetDeleteDialog();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="w-4 h-4" />
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Delete Account
                      </DialogTitle>
                      <DialogDescription>
                        This action is <strong>permanent and cannot be undone</strong>. 
                        All your data, including your profile, donations history, and forum posts will be deleted.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                        <p className="text-sm text-destructive font-medium">
                          Warning: This will immediately delete:
                        </p>
                        <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                          <li>Your user profile</li>
                          <li>All your forum posts and comments</li>
                          <li>Your donation history</li>
                          <li>Any download tokens</li>
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deleteConfirmation">
                          Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm
                        </Label>
                        <Input
                          id="deleteConfirmation"
                          value={deleteConfirmation}
                          onChange={(e) => setDeleteConfirmation(e.target.value)}
                          placeholder="DELETE MY ACCOUNT"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || deleteConfirmation !== "DELETE MY ACCOUNT"}
                      >
                        {isDeleting ? "Deleting..." : "Permanently Delete"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
