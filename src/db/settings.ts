import { db } from './db.ts'
import type { Settings } from './types.ts'

const SETTINGS_KEY = 'app'

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  dailyGoal: 10,
  voice: 'en-US',
  speechRate: 1,
  soundEffects: true,
  theme: 'system',
  reminders: { morning: false, noon: false, evening: false },
  activeDeckIds: ['giao-tiep-hang-ngay'],
}

/** Defaults overlaid with stored values, so fields added in later versions get defaults. */
function withDefaults(stored: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    reminders: { ...DEFAULT_SETTINGS.reminders, ...stored?.reminders },
    // Always a fresh array so callers can never mutate DEFAULT_SETTINGS.
    activeDeckIds: [...(stored?.activeDeckIds ?? DEFAULT_SETTINGS.activeDeckIds)],
  }
}

export async function getSettings(): Promise<Settings> {
  const record = await db.settings.get(SETTINGS_KEY)
  if (!record) return withDefaults(undefined)
  const { key: _key, ...stored } = record
  return withDefaults(stored)
}

/**
 * Adds `deckId` to `activeDeckIds` (appended, so earlier decks keep priority) or removes it.
 * Resolves to true when the deck is active afterwards.
 */
export async function toggleActiveDeck(deckId: string): Promise<boolean> {
  return db.transaction('rw', db.settings, async () => {
    const { activeDeckIds } = await getSettings()
    const active = !activeDeckIds.includes(deckId)
    await updateSettings({
      activeDeckIds: active ? [...activeDeckIds, deckId] : activeDeckIds.filter((id) => id !== deckId),
    })
    return active
  })
}

/** Merges `partial` into the stored settings and returns the resulting full settings. */
export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  return db.transaction('rw', db.settings, async () => {
    const current = await getSettings()
    const next = withDefaults({ ...current, ...partial })
    await db.settings.put({ ...next, key: SETTINGS_KEY })
    return next
  })
}
