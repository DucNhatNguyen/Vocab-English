import { useEffect } from 'react'
import { initNotifications, scheduleTagSync } from '../lib/notifications.ts'
import { useSettingsState } from './useSettings.ts'

/**
 * Renders nothing; keeps the push provider in step with the app: loads the SDK when reminders were
 * already granted, and re-sends the tags on app open, when the app comes back to the foreground
 * and whenever the reminder switches change (also after a backup restore).
 */
export default function NotificationEffects() {
  const { settings, loading } = useSettingsState()
  const { morning, noon, evening } = settings.reminders

  // App open
  useEffect(() => {
    void initNotifications()
  }, [])

  // iOS keeps a home-screen app alive in the background: coming back counts as opening it
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void initNotifications()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // Reminder switches changed (the first run after loading is the app-open sync)
  useEffect(() => {
    if (!loading) scheduleTagSync()
  }, [loading, morning, noon, evening])

  return null
}
