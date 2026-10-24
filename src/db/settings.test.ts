import 'fake-indexeddb/auto'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { db } from './db.ts'
import { DEFAULT_SETTINGS, getSettings, updateSettings } from './settings.ts'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

afterAll(() => {
  db.close()
})

describe('settings', () => {
  it('has the documented defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      dailyGoal: 10,
      voice: 'en-US',
      speechRate: 1,
      soundEffects: true,
      theme: 'system',
      reminders: { morning: false, noon: false, evening: false },
      activeDeckIds: ['giao-tiep-hang-ngay'],
    })
  })

  it('returns defaults when nothing is stored', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(await db.settings.count()).toBe(0)
  })

  it('stores a single record and merges updates', async () => {
    const result = await updateSettings({ dailyGoal: 20, theme: 'dark' })
    expect(result).toEqual({ ...DEFAULT_SETTINGS, dailyGoal: 20, theme: 'dark' })

    await updateSettings({ speechRate: 0.8 })
    expect(await getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      dailyGoal: 20,
      theme: 'dark',
      speechRate: 0.8,
    })
    expect(await db.settings.count()).toBe(1)
  })

  it('merges stored values over defaults so newly added fields get defaults', async () => {
    // Simulate a record written by an older app version that lacked soundEffects and reminders.
    await db.settings.put({ key: 'app', dailyGoal: 5, voice: 'en-GB' } as never)
    const settings = await getSettings()
    expect(settings.dailyGoal).toBe(5)
    expect(settings.voice).toBe('en-GB')
    expect(settings.soundEffects).toBe(true)
    expect(settings.reminders).toEqual({ morning: false, noon: false, evening: false })
    expect(settings.activeDeckIds).toEqual(['giao-tiep-hang-ngay'])
  })

  it('persists reminders and active decks', async () => {
    await updateSettings({
      reminders: { morning: true, noon: false, evening: true },
      activeDeckIds: ['du-lich', 'toeic-kinh-doanh'],
    })
    const settings = await getSettings()
    expect(settings.reminders).toEqual({ morning: true, noon: false, evening: true })
    expect(settings.activeDeckIds).toEqual(['du-lich', 'toeic-kinh-doanh'])
  })

  it('never lets callers mutate the defaults', async () => {
    const settings = await getSettings()
    settings.activeDeckIds.push('x')
    settings.reminders.morning = true
    expect(DEFAULT_SETTINGS.activeDeckIds).toEqual(['giao-tiep-hang-ngay'])
    expect(DEFAULT_SETTINGS.reminders.morning).toBe(false)
    expect((await getSettings()).activeDeckIds).toEqual(['giao-tiep-hang-ngay'])
  })
})
