 import { useState } from "react";
 import { Bell, BellOff, Smartphone, AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";
 import { Switch } from "@/components/ui/switch";
 import { Button } from "@/components/ui/button";
 import { usePushNotifications } from "@/hooks/usePushNotifications";
 import { useToast } from "@/hooks/use-toast";
 
 export function PushNotificationSettings() {
   const { toast } = useToast();
   const {
     isSupported,
     isSubscribed,
     permission,
     isLoading,
     isiOS,
     isPWA,
     subscribe,
     unsubscribe,
     sendTestNotification
   } = usePushNotifications();
   const [isSendingTest, setIsSendingTest] = useState(false);
 
   const handleToggle = async () => {
     try {
       if (isSubscribed) {
         await unsubscribe();
         toast({ title: "Notifications disabled" });
       } else {
         await subscribe();
         toast({ title: "Notifications enabled!" });
       }
     } catch (error: any) {
       toast({
         title: "Error",
         description: error.message,
         variant: "destructive",
       });
     }
   };
 
   const handleSendTest = async () => {
     setIsSendingTest(true);
     try {
       await sendTestNotification();
       toast({ title: "Test notification sent!" });
     } catch (error: any) {
       toast({ 
         title: "Failed to send", 
         description: error.message, 
         variant: "destructive" 
       });
     } finally {
       setIsSendingTest(false);
     }
   };
 
   // iOS not in PWA mode - show instructions
   if (isiOS && !isPWA) {
     return (
       <div className="glass-card p-6 space-y-4">
         <div className="flex items-center gap-3">
           <Smartphone className="w-5 h-5 text-primary" />
           <h3 className="font-semibold">Push Notifications</h3>
         </div>
         <div className="space-y-3 text-sm text-muted-foreground">
           <p className="font-medium text-foreground">Install the app first</p>
           <ol className="list-decimal list-inside space-y-2">
             <li>Tap the <strong>Share</strong> button in Safari</li>
             <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
             <li>Open the app from your home screen</li>
           </ol>
         </div>
       </div>
     );
   }
 
   // Not supported
   if (!isSupported) {
     return (
       <div className="glass-card p-6">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <BellOff className="w-5 h-5 text-muted-foreground" />
             <div>
               <h3 className="font-semibold">Push Notifications</h3>
               <p className="text-sm text-muted-foreground">Not supported in this browser</p>
             </div>
           </div>
         </div>
       </div>
     );
   }
 
   // Permission denied
   if (permission === 'denied') {
     return (
       <div className="glass-card p-6">
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <AlertCircle className="w-5 h-5 text-destructive" />
             <div>
               <h3 className="font-semibold">Push Notifications</h3>
               <p className="text-sm text-muted-foreground">Permission denied - update browser settings</p>
             </div>
           </div>
         </div>
       </div>
     );
   }
 
   return (
     <div className="glass-card p-6 space-y-4">
       <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
           {isSubscribed ? (
             <CheckCircle2 className="w-5 h-5 text-primary" />
           ) : (
             <Bell className="w-5 h-5 text-muted-foreground" />
           )}
           <div>
             <h3 className="font-semibold">Push Notifications</h3>
             <p className="text-sm text-muted-foreground">
               {isSubscribed ? "Enabled" : "Disabled"}
             </p>
           </div>
         </div>
         <Switch
           checked={isSubscribed}
           onCheckedChange={handleToggle}
           disabled={isLoading}
         />
       </div>
 
       {isSubscribed && (
         <Button
           variant="outline"
           size="sm"
           onClick={handleSendTest}
           disabled={isSendingTest}
           className="w-full"
         >
           {isSendingTest ? (
             <Loader2 className="w-4 h-4 animate-spin mr-2" />
           ) : (
             <Send className="w-4 h-4 mr-2" />
           )}
           Send Test Notification
         </Button>
       )}
     </div>
   );
 }