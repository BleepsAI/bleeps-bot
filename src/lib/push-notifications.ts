import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray as Uint8Array<ArrayBuffer>
}

export type PushPermissionState = 'granted' | 'denied' | 'default' | 'unsupported'

export function getPushPermissionState(): PushPermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported'
  }
  return Notification.permission
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service worker registered:', registration.scope)
    return registration
  } catch (error) {
    console.error('Service worker registration failed:', error)
    return null
  }
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription
  } catch (error) {
    console.error('Error getting existing subscription:', error)
    return null
  }
}

export async function subscribeToPush(userId: string): Promise<PushSubscription | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error('VAPID public key not configured')
    return null
  }

  try {
    // First check if we already have a subscription
    const existingSubscription = await getExistingSubscription()
    if (existingSubscription) {
      // Save to database in case it's not there
      await saveSubscriptionToDatabase(userId, existingSubscription)
      return existingSubscription
    }

    // Request permission if not already granted
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.log('Push notification permission denied')
      return null
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    })

    // Save to database
    await saveSubscriptionToDatabase(userId, subscription)

    console.log('Push subscription created:', subscription.endpoint)
    return subscription
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return null
  }
}

async function saveSubscriptionToDatabase(userId: string, subscription: PushSubscription): Promise<void> {
  const subscriptionJson = subscription.toJSON()

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh: subscriptionJson.keys?.p256dh,
      auth: subscriptionJson.keys?.auth,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,endpoint' })

  if (error) {
    console.error('Error saving push subscription:', error)
  }
}

export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  try {
    const subscription = await getExistingSubscription()
    if (subscription) {
      // Remove from database
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint)

      // Unsubscribe
      await subscription.unsubscribe()
    }
    return true
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    return false
  }
}

// Hook-friendly function to initialize push on component mount
export async function initializePush(userId: string): Promise<{
  permission: PushPermissionState
  subscription: PushSubscription | null
}> {
  // Register service worker first
  await registerServiceWorker()

  const permission = getPushPermissionState()

  // If already granted, get or create subscription
  if (permission === 'granted') {
    const subscription = await subscribeToPush(userId)
    return { permission, subscription }
  }

  return { permission, subscription: null }
}
