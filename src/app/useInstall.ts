import { useState, useSyncExternalStore } from 'react'
import { readEnvironment, type InstallEnvironment } from '../lib/install.ts'
import { installPrompt } from '../lib/installPrompt.ts'

/** Browser/platform facts, read once per mount (they do not change while the page is open). */
export function useInstallEnvironment(): InstallEnvironment {
  const [env] = useState(readEnvironment)
  return env
}

/** Whether Chromium offered a native install dialog (always false on iOS). */
export function useCanPromptInstall(): boolean {
  return useSyncExternalStore(installPrompt.subscribe, () => installPrompt.getSnapshot() !== null)
}
