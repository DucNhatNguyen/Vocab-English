import { useEffect } from 'react'
import { setSoundEffectsEnabled } from '../lib/sfx.ts'
import { setSpeechSettings } from '../lib/speech.ts'
import { applyTheme } from '../lib/theme.ts'
import { useSettingsState } from './useSettings.ts'

/** Renders nothing; pushes stored settings into the theme and the speech module. */
export default function SettingsEffects() {
  const { settings, loading } = useSettingsState()

  useEffect(() => {
    setSpeechSettings(settings)
  }, [settings])

  useEffect(() => {
    setSoundEffectsEnabled(settings.soundEffects)
  }, [settings.soundEffects])

  useEffect(() => {
    // Skip the defaults shown while loading: they would flash a forced theme back to "system"
    if (!loading) applyTheme(settings.theme)
  }, [loading, settings.theme])

  // "system" mode: keep the theme-color meta in step with the OS appearance
  useEffect(() => {
    if (settings.theme !== 'system' || typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [settings.theme])

  return null
}
