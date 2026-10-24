import type { Settings } from '../db/types.ts'

/**
 * The six data tags the app keeps on the push provider (spec 6.4). The provider only knows these;
 * the learning data itself stays on the device. Pure, so it is unit-tested without any SDK.
 */
export const TAG_NAMES = ['nhac_sang', 'nhac_trua', 'nhac_toi', 'tu_moi', 'so_tu_on', 'streak'] as const

export type ReminderTags = Record<(typeof TAG_NAMES)[number], string>

/** Reminder switches -> `nhac_sang` / `nhac_trua` / `nhac_toi` as "1" / "0". */
export function buildReminderTags(
  reminders: Settings['reminders'],
): Pick<ReminderTags, 'nhac_sang' | 'nhac_trua' | 'nhac_toi'> {
  return {
    nhac_sang: reminders.morning ? '1' : '0',
    nhac_trua: reminders.noon ? '1' : '0',
    nhac_toi: reminders.evening ? '1' : '0',
  }
}

export interface ProgressTagInput {
  /** The first word the next new-word lesson would pick; null when nothing is left to learn. */
  nextWord: string | null
  /** Cards due by tomorrow (what the user will find in the next review). */
  dueTomorrow: number
  /** Current streak in days. */
  streak: number
}

function count(value: number): string {
  return String(Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0)
}

/** `tu_moi` / `so_tu_on` / `streak`. An empty `tu_moi` makes the template fall back to its default. */
export function buildProgressTags(
  input: ProgressTagInput,
): Pick<ReminderTags, 'tu_moi' | 'so_tu_on' | 'streak'> {
  return {
    tu_moi: input.nextWord?.trim() ?? '',
    so_tu_on: count(input.dueTomorrow),
    streak: count(input.streak),
  }
}

/** All six tags, in one object. */
export function buildAllTags(input: ProgressTagInput & { reminders: Settings['reminders'] }): ReminderTags {
  return { ...buildReminderTags(input.reminders), ...buildProgressTags(input) }
}

/** Same tags -> same string; lets the sender skip an update that would change nothing. */
export function tagsKey(tags: ReminderTags): string {
  return JSON.stringify(TAG_NAMES.map((name) => tags[name]))
}
