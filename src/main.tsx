import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './app/App.tsx'
import { requestPersistentStorage } from './lib/storage.ts'

// autoUpdate: the new service worker activates itself; reload happens on next launch.
registerSW({ immediate: true })

// Ask Safari/browsers not to evict our IndexedDB data. Never throws.
void requestPersistentStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
