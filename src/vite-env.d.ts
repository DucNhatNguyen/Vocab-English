/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_ONESIGNAL_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** package.json version, injected by Vite (see vite.config.ts). */
declare const __APP_VERSION__: string
