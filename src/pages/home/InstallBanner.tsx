import { Download, Smartphone, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useCanPromptInstall, useInstallEnvironment } from '../../app/useInstall.ts'
import { paths } from '../../app/paths.ts'
import {
  bannerKind,
  inAppName,
  readBannerDismissed,
  writeBannerDismissed,
  type BannerKind,
} from '../../lib/install.ts'
import { promptInstall } from '../../lib/installPrompt.ts'

/**
 * Home nudge to install the app: iOS Safari (not installed yet), in-app browsers (open in a real
 * browser first) and Chromium when it offered the native prompt. Dismissal is kept for 7 days.
 */
export default function InstallBanner() {
  const env = useInstallEnvironment()
  const canPrompt = useCanPromptInstall()
  const [dismissed, setDismissed] = useState(readBannerDismissed)

  const kind: BannerKind | null = dismissed ? null : bannerKind(env, canPrompt)
  if (!kind) return null

  const browser = env.platform === 'ios' ? 'Safari' : 'Chrome'
  const text =
    kind === 'in-app'
      ? `Bạn đang mở trong ${env.inApp ? inAppName(env.inApp) : 'một ứng dụng khác'}. Hãy mở bằng ${browser} rồi cài Từ Ngày lên màn hình chính.`
      : 'Cài Từ Ngày lên màn hình chính để học offline và nhận nhắc học.'

  function dismiss() {
    writeBannerDismissed()
    setDismissed(true)
  }

  return (
    <section className="install-banner" aria-label="Gợi ý cài app">
      <Smartphone className="install-banner__icon" size={22} aria-hidden="true" />
      <p className="install-banner__text">{text}</p>
      <button type="button" className="icon-btn install-banner__close" aria-label="Ẩn gợi ý cài app" onClick={dismiss}>
        <X size={20} aria-hidden="true" />
      </button>
      {kind === 'prompt' ? (
        <button type="button" className="btn btn--primary install-banner__go" onClick={() => void promptInstall()}>
          <Download size={18} aria-hidden="true" />
          Cài app
        </button>
      ) : (
        <Link to={paths.install} className="btn btn--ghost install-banner__go">
          {kind === 'in-app' ? 'Xem cách mở' : 'Xem cách cài'}
        </Link>
      )}
    </section>
  )
}
