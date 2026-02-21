 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 
 // VAPID public key - this is the PUBLIC key and is safe to expose in frontend
 // Users need to add VITE_VAPID_PUBLIC_KEY to their .env file with the same value as VAPID_PUBLIC_KEY secret
 // This is a workaround since Supabase secrets are not exposed to the frontend
 const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
 
 function urlBase64ToUint8Array(base64String: string): Uint8Array {
   const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
   const base64 = (base64String + padding)
     .replace(/-/g, '+')
     .replace(/_/g, '/');
 
   const rawData = window.atob(base64);
   const outputArray = new Uint8Array(rawData.length);
 
   for (let i = 0; i < rawData.length; ++i) {
     outputArray[i] = rawData.charCodeAt(i);
   }
   return outputArray;
 }
 
 export function usePushNotifications() {
   const [isSupported, setIsSupported] = useState(false);
   const [isSubscribed, setIsSubscribed] = useState(false);
   const [permission, setPermission] = useState<NotificationPermission>('default');
   const [isLoading, setIsLoading] = useState(false);
   const [isiOS, setIsiOS] = useState(false);
   const [isPWA, setIsPWA] = useState(false);
 
   useEffect(() => {
     // Detect iOS
     const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
     setIsiOS(isIOSDevice);
 
     // Detect PWA mode (standalone)
     const isPWAMode = window.matchMedia('(display-mode: standalone)').matches || 
                       (navigator as any).standalone === true;
     setIsPWA(isPWAMode);
 
     // Check support
     const checkSupport = () => {
       const hasServiceWorker = 'serviceWorker' in navigator;
       const hasPushManager = 'PushManager' in window;
       const hasNotification = 'Notification' in window;
 
       // CRITICAL: On iOS, push only works when running as PWA
       if (isIOSDevice && !isPWAMode) {
         setIsSupported(false);
         return;
       }
 
       setIsSupported(hasServiceWorker && hasPushManager && hasNotification);
     };
 
     checkSupport();
 
     if ('Notification' in window) {
       setPermission(Notification.permission);
     }
 
     checkSubscription();
   }, []);
 
   const checkSubscription = async () => {
     try {
       if (!('serviceWorker' in navigator)) return;
 
       const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
       if (!registration) {
         setIsSubscribed(false);
         return;
       }
 
        const subscription = await (registration as any).pushManager.getSubscription();
       setIsSubscribed(!!subscription);
     } catch (error) {
       console.error('[Push] Error checking subscription:', error);
       setIsSubscribed(false);
     }
   };
 
   const subscribe = useCallback(async () => {
     if (!isSupported) {
       throw new Error('Push notifications are not supported');
     }
 
     if (!VAPID_PUBLIC_KEY) {
       throw new Error('VAPID public key not configured. Add VITE_VAPID_PUBLIC_KEY to your .env file.');
     }
 
     setIsLoading(true);
 
     try {
       // Request permission (MUST be triggered by user gesture)
       const permission = await Notification.requestPermission();
       setPermission(permission);
 
       if (permission !== 'granted') {
         throw new Error('Notification permission denied');
       }
 
       // Register service worker
       const registration = await navigator.serviceWorker.register('/sw-push.js', {
         scope: '/'
       });
 
       console.log('[Push] Service worker registered:', registration);
 
       // Wait for service worker to be ready
       await navigator.serviceWorker.ready;
 
       // Subscribe to push
       const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
       const subscription = await (registration as any).pushManager.subscribe({
         userVisibleOnly: true,
         applicationServerKey: applicationServerKey.buffer as ArrayBuffer
       });
 
       console.log('[Push] Push subscription:', subscription);
 
       // Extract keys
       const p256dhKey = subscription.getKey('p256dh');
       const authKey = subscription.getKey('auth');
 
       if (!p256dhKey || !authKey) {
         throw new Error('Failed to get subscription keys');
       }
 
       const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
       const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));
 
       // Get current user
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) {
         throw new Error('User not authenticated');
       }
 
       // Store subscription in database
       const { error } = await supabase
         .from('push_subscriptions')
         .upsert({
           user_id: user.id,
           endpoint: subscription.endpoint,
           p256dh,
           auth
         }, {
           onConflict: 'user_id,endpoint'
         });
 
       if (error) {
         console.error('[Push] Error storing subscription:', error);
         throw error;
       }
 
       setIsSubscribed(true);
       console.log('[Push] Successfully subscribed to push notifications');
 
     } catch (error) {
       console.error('[Push] Error subscribing:', error);
       throw error;
     } finally {
       setIsLoading(false);
     }
   }, [isSupported]);
 
   const unsubscribe = useCallback(async () => {
     setIsLoading(true);
 
     try {
       const registration = await navigator.serviceWorker.getRegistration('/sw-push.js');
       if (!registration) {
         setIsSubscribed(false);
         return;
       }
 
       const subscription = await (registration as any).pushManager.getSubscription();
       if (subscription) {
         await subscription.unsubscribe();
 
         // Remove from database
         const { data: { user } } = await supabase.auth.getUser();
         if (user) {
           await supabase
             .from('push_subscriptions')
             .delete()
             .eq('user_id', user.id)
             .eq('endpoint', subscription.endpoint);
         }
       }
 
       setIsSubscribed(false);
       console.log('[Push] Successfully unsubscribed from push notifications');
 
     } catch (error) {
       console.error('[Push] Error unsubscribing:', error);
       throw error;
     } finally {
       setIsLoading(false);
     }
   }, []);
 
   const sendTestNotification = useCallback(async () => {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) throw new Error('Not authenticated');
 
     const { error } = await supabase.functions.invoke('send-push-notification', {
       body: {
         user_id: user.id,
         payload: {
           title: 'Test Notification 🔔',
           body: 'Push notifications are working!',
           url: '/'
         }
       }
     });
 
     if (error) throw error;
   }, []);
 
   return {
     isSupported,
     isSubscribed,
     permission,
     isLoading,
     isiOS,
     isPWA,
     subscribe,
     unsubscribe,
     sendTestNotification
   };
 }