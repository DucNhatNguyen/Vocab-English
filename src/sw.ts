/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// tsconfig.sw.json does not load vite/client; only the one variable the worker reads is typed.
declare global {
  interface ImportMeta {
    readonly env: { readonly VITE_ONESIGNAL_APP_ID?: string }
  }
}

// OneSignal's worker code (push + notificationclick handlers) is merged into this worker. It must
// run synchronously during the first evaluation of the worker, so it stays at top level, and it is
// classic-worker only: vite.config.ts builds this file as an iife. The page SDK is initialised with
// { serviceWorkerPath: 'sw.js' } (src/lib/notifications.ts) so it reuses this worker.
// Only built in when VITE_ONESIGNAL_APP_ID is set. The try/catch keeps a failed fetch of the CDN
// script (offline install or update) from killing the worker and with it offline mode.
if (import.meta.env.VITE_ONESIGNAL_APP_ID) {
  try {
    importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')
  } catch {
    // push is unavailable until the next worker update; the rest of the worker keeps working
  }
}

// autoUpdate: a new worker takes over immediately.
void self.skipWaiting()
clientsClaim()

// Precache the build output injected by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA fallback: serve the precached index.html for navigation requests.
// File-like URLs (anything with an extension) are left to the network / precache.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/\/[^/?]+\.[^/]+$/],
  }),
)
