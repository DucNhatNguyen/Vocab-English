import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
// Self-hosted fonts (offline). Only the subsets we need: Vietnamese + Latin (+ Latin Extended for IPA-adjacent marks).
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/latin-500.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/latin-700.css'
import '@fontsource/be-vietnam-pro/latin-ext-400.css'
import '@fontsource/be-vietnam-pro/latin-ext-500.css'
import '@fontsource/be-vietnam-pro/latin-ext-600.css'
import '@fontsource/be-vietnam-pro/latin-ext-700.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-500.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-700.css'
import '@fontsource/patrick-hand/latin-400.css'
import '@fontsource/patrick-hand/vietnamese-400.css'
import './index.css'
import App from './app/App.tsx'
import { installPrompt } from './lib/installPrompt.ts'
import { initSpeech } from './lib/speech.ts'
import { requestPersistentStorage } from './lib/storage.ts'

// autoUpdate: the new service worker activates itself; reload happens on next launch.
registerSW({ immediate: true })

// Ask Safari/browsers not to evict our IndexedDB data. Never throws.
void requestPersistentStorage()

// Capture Chromium's install prompt: it fires early, before the UI is ready to use it.
installPrompt.listen(window)

// Start loading speech voices early (they arrive asynchronously).
initSpeech()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
