/**
 * Chromium's install prompt (Android, desktop). The browser fires `beforeinstallprompt` once,
 * early; we keep the event so a button can open the native dialog later. iOS never fires it.
 */

/** Not in lib.dom.d.ts. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type PromptResult = 'accepted' | 'dismissed' | 'unavailable'

type Listener = () => void

/** Minimal slice of `window`, so tests can use a plain EventTarget. */
type EventSource = Pick<EventTarget, 'addEventListener'>

export interface InstallPromptStore {
  /** Starts listening. Call once, as early as possible (before React renders). */
  listen(target: EventSource): void
  subscribe(listener: Listener): () => void
  /** The captured event, or null when the browser has not offered one (or it was used). */
  getSnapshot(): BeforeInstallPromptEvent | null
  /** Opens the native install dialog. */
  prompt(): Promise<PromptResult>
}

export function createInstallPromptStore(): InstallPromptStore {
  let event: BeforeInstallPromptEvent | null = null
  let listening = false
  const listeners = new Set<Listener>()

  function set(next: BeforeInstallPromptEvent | null) {
    event = next
    listeners.forEach((listener) => listener())
  }

  return {
    listen(target) {
      if (listening) return
      listening = true
      target.addEventListener('beforeinstallprompt', (e) => {
        // Hold the mini-infobar back; our own button opens the dialog
        e.preventDefault()
        set(e as BeforeInstallPromptEvent)
      })
      target.addEventListener('appinstalled', () => set(null))
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getSnapshot: () => event,
    async prompt() {
      const current = event
      if (!current) return 'unavailable'
      // An event can be prompted only once; whatever the answer, it is spent
      set(null)
      try {
        await current.prompt()
        return (await current.userChoice).outcome
      } catch {
        return 'unavailable'
      }
    },
  }
}

/** App-wide instance, started from main.tsx. */
export const installPrompt = createInstallPromptStore()

export function promptInstall(): Promise<PromptResult> {
  return installPrompt.prompt()
}
