/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

// TODO(step 10 - OneSignal): merge the OneSignal SDK worker into this service worker.
// Add the following as a top-level call (it must run synchronously during the first
// evaluation of the worker, so keep it out of any callback / async code):
//
//   importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js')
//
// This works because vite.config.ts builds this file as a classic (iife) worker
// (injectManifest.rollupFormat = 'iife'). The OneSignal page SDK must then be
// initialised with { serviceWorkerPath: 'sw.js' } (and serviceWorkerParam scope '/')
// so that it reuses this worker instead of registering OneSignalSDKWorker.js.

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
