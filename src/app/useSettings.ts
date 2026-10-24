import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings, DEFAULT_SETTINGS } from '../db/settings.ts'
import type { Settings } from '../db/types.ts'

/** Live settings; `loading` is true until the first read finished (settings are defaults until then). */
export function useSettingsState(): { settings: Settings; loading: boolean } {
  const stored = useLiveQuery(getSettings)
  return { settings: stored ?? DEFAULT_SETTINGS, loading: stored === undefined }
}

export function useSettings(): Settings {
  return useSettingsState().settings
}
