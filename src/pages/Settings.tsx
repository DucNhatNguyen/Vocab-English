import {
  ChevronRight,
  Gauge,
  Info,
  Library,
  Mic,
  Moon,
  Music,
  Palette,
  Smartphone,
  Sun,
  Sunrise,
  Target,
  Volume2,
  type LucideIcon,
} from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '../app/paths.ts'
import { useSettingsState } from '../app/useSettings.ts'
import IconBadge, { type BadgeHue } from '../components/IconBadge.tsx'
import PageHeader from '../components/PageHeader.tsx'
import Segmented, { type SegmentedOption } from '../components/Segmented.tsx'
import Switch from '../components/Switch.tsx'
import { decks } from '../data/index.ts'
import { updateSettings } from '../db/settings.ts'
import type { Settings as SettingsData } from '../db/types.ts'
import { playSfx, setSoundEffectsEnabled } from '../lib/sfx.ts'
import { isSpeechSupported, speak } from '../lib/speech.ts'
import BackupSection from './settings/BackupSection.tsx'
import PushRows from './settings/PushRows.tsx'

const GOAL_OPTIONS: SegmentedOption<number>[] = [
  { value: 5, label: '5 từ' },
  { value: 10, label: '10 từ' },
  { value: 20, label: '20 từ' },
]

const VOICE_OPTIONS: SegmentedOption<SettingsData['voice']>[] = [
  { value: 'en-US', label: 'Anh–Mỹ' },
  { value: 'en-GB', label: 'Anh–Anh' },
]

const THEME_OPTIONS: SegmentedOption<SettingsData['theme']>[] = [
  { value: 'system', label: 'Theo hệ thống' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
]

const REMINDERS: Array<{
  key: keyof SettingsData['reminders']
  label: string
  time: string
  icon: LucideIcon
  hue: BadgeHue
}> = [
  { key: 'morning', label: 'Sáng', time: '7:30', icon: Sunrise, hue: 'orange' },
  { key: 'noon', label: 'Trưa', time: '12:15', icon: Sun, hue: 'blue' },
  { key: 'evening', label: 'Tối', time: '21:00', icon: Moon, hue: 'violet' },
]

const SAMPLE_WORD = 'vocabulary'
const RATE_MIN = 0.8
const RATE_MAX = 1.2

function formatRate(rate: number): string {
  return `${rate.toFixed(1).replace('.', ',')}×`
}

/** A named group of settings: small caps heading + one glass sheet. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <section className="settings__section" aria-labelledby={id}>
      <h2 className="label" id={id}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** Label + segmented control as one list row. */
function SegmentedSetting<T extends string | number>({
  label,
  icon,
  hue,
  options,
  value,
  onChange,
}: {
  label: string
  icon: LucideIcon
  hue: BadgeHue
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  const labelId = useId()
  return (
    <li className="setting">
      <div className="setting__head">
        <IconBadge icon={icon} hue={hue} size="sm" />
        <div className="setting__label" id={labelId}>
          {label}
        </div>
      </div>
      <Segmented labelledBy={labelId} options={options} value={value} onChange={onChange} />
    </li>
  )
}

/** Slider that keeps its own value while dragging, so it never jumps back before the save lands. */
function SpeechRateSetting({ value }: { value: number }) {
  const id = useId()
  const [draft, setDraft] = useState<number | null>(null)
  const shown = draft ?? value

  // Our save landed, or settings changed elsewhere (e.g. a restore): show the stored value again
  const [seen, setSeen] = useState(value)
  if (seen !== value) {
    setSeen(value)
    setDraft(null)
  }

  return (
    <li className="setting">
      <div className="setting__head">
        <IconBadge icon={Gauge} hue="orange" size="sm" />
        <label className="setting__label" htmlFor={id}>
          Tốc độ đọc
        </label>
        <output className="setting__value" htmlFor={id}>
          {formatRate(shown)}
        </output>
      </div>
      <input
        id={id}
        className="range"
        type="range"
        min={RATE_MIN}
        max={RATE_MAX}
        step={0.1}
        value={shown}
        aria-valuetext={formatRate(shown)}
        onChange={(event) => {
          const rate = Math.round(Number(event.target.value) * 10) / 10
          setDraft(rate)
          void updateSettings({ speechRate: rate })
        }}
      />
      <div className="range__ends" aria-hidden="true">
        <span>Chậm</span>
        <span>Nhanh</span>
      </div>
    </li>
  )
}

export default function Settings() {
  const { settings, loading } = useSettingsState()

  // Loading: render only the shell so default values do not flash
  if (loading) return <PageHeader title="Cài đặt" />

  const activeDecks = decks.filter((deck) => settings.activeDeckIds.includes(deck.id)).length
  const speechSupported = isSpeechSupported()

  function previewVoice() {
    // Must run inside the click handler: iOS only allows speech from a user gesture
    speak(SAMPLE_WORD, { voice: settings.voice, rate: settings.speechRate })
  }

  function onSoundEffects(enabled: boolean) {
    void updateSettings({ soundEffects: enabled })
    if (enabled) {
      // The module flag is only synced after the save lands; set it now so the cue can play
      setSoundEffectsEnabled(true)
      playSfx('correct')
    }
  }

  return (
    <>
      <PageHeader title="Cài đặt" />
      <div className="page settings">
        <Section title="Học tập">
          <ul className="sheet ruled">
            <SegmentedSetting
              label="Mục tiêu mỗi ngày"
              icon={Target}
              hue="blue"
              options={GOAL_OPTIONS}
              value={settings.dailyGoal}
              onChange={(dailyGoal) => void updateSettings({ dailyGoal })}
            />
            <li>
              <Link to={paths.decks} className="row">
                <IconBadge icon={Library} hue="violet" size="sm" />
                <span className="row__label">Chọn bộ từ đang học</span>
                <span className="row__value">{activeDecks} bộ</span>
                <ChevronRight size={18} className="row__chevron" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </Section>

        <Section title="Phát âm">
          <ul className="sheet ruled">
            <SegmentedSetting
              label="Giọng đọc"
              icon={Mic}
              hue="pink"
              options={VOICE_OPTIONS}
              value={settings.voice}
              onChange={(voice) => void updateSettings({ voice })}
            />
            <SpeechRateSetting value={settings.speechRate} />
            <li className="setting">
              <button type="button" className="btn btn--ghost" disabled={!speechSupported} onClick={previewVoice}>
                <Volume2 size={20} aria-hidden="true" />
                Nghe thử
              </button>
              {!speechSupported && (
                <p className="setting__note">Thiết bị này chưa hỗ trợ đọc thành tiếng.</p>
              )}
            </li>
          </ul>
        </Section>

        <Section title="Âm thanh & giao diện">
          <ul className="sheet ruled">
            <li>
              <Switch
                label="Hiệu ứng âm thanh đúng/sai"
                leading={<IconBadge icon={Music} hue="green" size="sm" />}
                checked={settings.soundEffects}
                onChange={onSoundEffects}
              />
            </li>
            <SegmentedSetting
              label="Giao diện"
              icon={Palette}
              hue="violet"
              options={THEME_OPTIONS}
              value={settings.theme}
              onChange={(theme) => void updateSettings({ theme })}
            />
          </ul>
        </Section>

        <Section title="Nhắc học">
          <ul className="sheet ruled">
            {REMINDERS.map(({ key, label, time, icon, hue }) => (
              <li key={key}>
                <Switch
                  label={label}
                  leading={<IconBadge icon={icon} hue={hue} size="sm" />}
                  description={time}
                  checked={settings.reminders[key]}
                  onChange={(checked) =>
                    void updateSettings({ reminders: { ...settings.reminders, [key]: checked } })
                  }
                />
              </li>
            ))}
            <PushRows anyReminder={Object.values(settings.reminders).some(Boolean)} />
          </ul>
        </Section>

        <Section title="Dữ liệu">
          <BackupSection />
        </Section>

        <Section title="Thông tin">
          <ul className="sheet ruled">
            <li className="row">
              <IconBadge icon={Info} hue="blue" size="sm" />
              <span className="row__label">Từ Ngày</span>
              <span className="row__value">Phiên bản {__APP_VERSION__}</span>
            </li>
            <li>
              <Link to={paths.install} className="row">
                <IconBadge icon={Smartphone} hue="pink" size="sm" />
                <span className="row__label">Cài app lên iPhone</span>
                <ChevronRight size={18} className="row__chevron" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </Section>
      </div>
    </>
  )
}
