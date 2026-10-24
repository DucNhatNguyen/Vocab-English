import { BellRing, CircleCheck, Download, Maximize, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useCanPromptInstall, useInstallEnvironment } from '../app/useInstall.ts'
import { paths } from '../app/paths.ts'
import PageHeader from '../components/PageHeader.tsx'
import {
  formatIosVersion,
  inAppName,
  supportsWebPush,
  type InstallEnvironment,
  type IosBrowser,
} from '../lib/install.ts'
import { promptInstall } from '../lib/installPrompt.ts'
import CopyLink from './install/CopyLink.tsx'
import {
  AddButtonIllustration,
  AddToHomeRowIllustration,
  ShareButtonIllustration,
} from './install/IosIllustrations.tsx'

const IOS_BROWSER_NAMES: Record<IosBrowser, string> = {
  safari: 'Safari',
  chrome: 'Chrome',
  firefox: 'Firefox',
  edge: 'Edge',
}

function Notice({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <p className="install-notice">
      <Icon size={20} aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/** Already installed: say so and point at what to do next. */
function InstalledCard() {
  return (
    <section className="install-card install-card--done" aria-labelledby="install-done">
      <h2 className="install-card__title" id="install-done">
        <CircleCheck size={24} aria-hidden="true" />
        Bạn đã cài Từ Ngày
      </h2>
      <p>
        Từ giờ hãy luôn mở app bằng biểu tượng Từ Ngày trên màn hình chính. Muốn nhận nhắc học, vào mục{' '}
        <Link to={paths.settings} className="text-link">
          Cài đặt
        </Link>
        .
      </p>
    </section>
  )
}

/** Inside Zalo, Facebook & co: the link has to be opened in a real browser first. */
function InAppCard({ env }: { env: InstallEnvironment }) {
  const browser = env.platform === 'ios' ? 'Safari' : 'Chrome'
  return (
    <section className="install-card" aria-labelledby="install-inapp">
      <h2 className="install-card__title" id="install-inapp">
        Mở bằng {browser} trước
      </h2>
      <p>
        Bạn đang mở Từ Ngày trong {env.inApp ? inAppName(env.inApp) : 'một ứng dụng khác'}. Trình duyệt trong ứng
        dụng không cài được app.
      </p>
      <ol className="install-card__list">
        <li>
          Bấm nút <strong>⋯</strong> (hoặc nút chia sẻ) ở góc màn hình.
        </li>
        <li>
          Chọn <strong>“Mở bằng {browser}”</strong> hoặc <strong>“Mở trong trình duyệt”</strong>.
        </li>
      </ol>
      <p className="install-card__or">Hoặc sao chép liên kết rồi dán vào {browser}:</p>
      <CopyLink url={window.location.href} />
    </section>
  )
}

/** One numbered step of the iPhone guide: badge, title, text and picture. */
function Step({ n, title, children, picture }: { n: number; title: ReactNode; children: ReactNode; picture: ReactNode }) {
  return (
    <li className="step">
      <div className="step__head">
        <span className="step__num" aria-hidden="true">
          {n}
        </span>
        <h3 className="step__title">{title}</h3>
      </div>
      <p className="step__text">{children}</p>
      <div className="step__picture">{picture}</div>
    </li>
  )
}

function IosSteps({ env, shownOnOtherDevice }: { env: InstallEnvironment; shownOnOtherDevice: boolean }) {
  const browser = env.iosBrowser ?? 'safari'
  const olderThanSupport = env.platform === 'ios' && !supportsWebPush(env.iosVersion)
  return (
    <section className="install-guide" aria-labelledby="install-steps">
      <h2 className="install-guide__title" id="install-steps">
        {shownOnOtherDevice ? 'Hướng dẫn cho iPhone' : 'Cài lên màn hình chính'}
      </h2>

      {shownOnOtherDevice && (
        <div className="install-card">
          <p>
            Hãy mở liên kết này trên iPhone bằng <strong>Safari</strong>, rồi làm theo 3 bước dưới đây. Bạn có thể sao
            chép liên kết để gửi sang iPhone:
          </p>
          <CopyLink url={window.location.href} />
        </div>
      )}

      {!shownOnOtherDevice && !env.inApp && browser !== 'safari' && (
        <Notice icon={TriangleAlert}>
          {olderThanSupport
            ? `iOS ${env.iosVersion ? formatIosVersion(env.iosVersion) : ''} chỉ cho cài từ Safari. Hãy mở liên kết này bằng Safari.`
            : `Bạn đang dùng ${IOS_BROWSER_NAMES[browser]}. Từ iOS 16.4, trình duyệt này cũng thêm được vào màn hình chính, nhưng nên dùng Safari để chắc chắn nhận được nhắc học.`}
        </Notice>
      )}

      <ol className="install-steps sheet ruled">
        <Step
          n={1}
          title="Bấm nút Chia sẻ"
          picture={<ShareButtonIllustration label="Thanh công cụ Safari ở cuối màn hình, nút Chia sẻ ở giữa được khoanh tròn" />}
        >
          {!shownOnOtherDevice && browser !== 'safari'
            ? `Trong ${IOS_BROWSER_NAMES[browser]}, nút Chia sẻ nằm ở thanh địa chỉ hoặc trong menu ⋯.`
            : 'Nút nằm giữa thanh công cụ dưới cùng của Safari. Trên iPad, nút ở góc trên bên phải.'}
        </Step>
        <Step
          n={2}
          title="Chọn “Thêm vào Màn hình chính”"
          picture={<AddToHomeRowIllustration label="Bảng chia sẻ, dòng Thêm vào MH chính được tô sáng" />}
        >
          Kéo bảng chia sẻ lên nếu chưa thấy dòng này. Biểu tượng của nó là dấu cộng trong một ô vuông.
        </Step>
        <Step
          n={3}
          title="Bấm “Thêm”"
          picture={<AddButtonIllustration label="Hộp thoại Thêm vào MH chính, nút Thêm ở góc trên bên phải được khoanh tròn" />}
        >
          Nút ở góc trên bên phải. Giữ nguyên tên “Từ Ngày”.
        </Step>
      </ol>
      <p className="install-guide__after">
        Xong! Mở Từ Ngày bằng biểu tượng mới trên màn hình chính, không mở lại bằng {shownOnOtherDevice ? 'trình duyệt' : IOS_BROWSER_NAMES[browser]}.
      </p>
    </section>
  )
}

/** Android and desktop Chromium: the native dialog when offered, else the browser menu. */
function OtherInstall({ canPrompt, android }: { canPrompt: boolean; android: boolean }) {
  const [answer, setAnswer] = useState<'dismissed' | 'unavailable' | null>(null)

  async function install() {
    const result = await promptInstall()
    // 'accepted' needs no message: the app is installing and the prompt is gone
    setAnswer(result === 'dismissed' || result === 'unavailable' ? result : null)
  }

  if (canPrompt) {
    return (
      <section className="install-card" aria-labelledby="install-other">
        <h2 className="install-card__title" id="install-other">
          Cài Từ Ngày như một app
        </h2>
        <p>Trình duyệt này cài được Từ Ngày: mở toàn màn hình, có biểu tượng riêng và học được cả khi mất mạng.</p>
        <button type="button" className="btn btn--primary install-card__action" onClick={() => void install()}>
          <Download size={20} aria-hidden="true" />
          Cài app
        </button>
      </section>
    )
  }

  return (
    <section className="install-card" aria-labelledby="install-other">
      <h2 className="install-card__title" id="install-other">
        Cài Từ Ngày như một app
      </h2>
      {answer && (
        <p className="install-card__note">
          {answer === 'dismissed' ? 'Bạn đã bỏ qua lần này.' : 'Trình duyệt chưa cho cài lúc này.'} Bạn vẫn cài được từ
          menu của trình duyệt.
        </p>
      )}
      {android ? (
        <ol className="install-card__list">
          <li>
            Mở menu <strong>⋮</strong> của Chrome.
          </li>
          <li>
            Chọn <strong>“Cài đặt ứng dụng”</strong> (hoặc <strong>“Thêm vào màn hình chính”</strong>).
          </li>
          <li>
            Bấm <strong>“Cài đặt”</strong>.
          </li>
        </ol>
      ) : (
        <p>
          Với Chrome hoặc Edge trên máy tính, bấm biểu tượng cài đặt ở cuối thanh địa chỉ, hoặc mở menu <strong>⋯</strong>{' '}
          rồi chọn <strong>“Ứng dụng”</strong> và <strong>“Cài đặt Từ Ngày”</strong>. Firefox và Safari trên máy tính
          chưa hỗ trợ.
        </p>
      )}
    </section>
  )
}

function WhyInstall({ env }: { env: InstallEnvironment }) {
  const noPush = env.platform === 'ios' && !supportsWebPush(env.iosVersion)
  return (
    <section className="install-why" aria-labelledby="install-why">
      <h2 className="label" id="install-why">
        Vì sao nên cài?
      </h2>
      <ul className="sheet ruled">
        <li className="install-why__item">
          <WifiOff size={22} aria-hidden="true" />
          <span>Học được cả khi không có mạng.</span>
        </li>
        <li className="install-why__item">
          <Maximize size={22} aria-hidden="true" />
          <span>Mở toàn màn hình, có biểu tượng riêng như một app thật.</span>
        </li>
        <li className="install-why__item">
          <BellRing size={22} aria-hidden="true" />
          <span>
            Nhắc học chỉ hoạt động sau khi cài lên màn hình chính, và cần iOS 16.4 trở lên.
          </span>
        </li>
      </ul>
      {noPush && env.iosVersion && (
        <Notice icon={TriangleAlert}>
          Máy bạn chạy iOS {formatIosVersion(env.iosVersion)} nên chưa nhận được thông báo nhắc học. Bạn vẫn cài và
          học offline bình thường.
        </Notice>
      )}
    </section>
  )
}

function Remember() {
  return (
    <section className="install-remember" aria-labelledby="install-remember">
      <h2 className="label" id="install-remember">
        Cần nhớ
      </h2>
      <p>
        Nếu xoá Từ Ngày khỏi màn hình chính, đăng ký nhận nhắc học sẽ mất (phải bật lại sau khi cài lại) và dữ liệu học
        trên máy có thể bị xoá theo. Hãy thường xuyên{' '}
        <Link to={paths.settings} className="text-link">
          sao lưu dữ liệu trong Cài đặt
        </Link>
        .
      </p>
    </section>
  )
}

/** "Cài app lên iPhone": install guide tailored to the visitor's browser. */
export default function Install() {
  const env = useInstallEnvironment()
  const canPrompt = useCanPromptInstall()
  // Other devices (and installed iPhones) can still read the iPhone steps, e.g. to help a friend
  const [showIphone, setShowIphone] = useState(false)

  const onIos = env.platform === 'ios'
  const iosGuideAuto = onIos && !env.standalone
  const showIosSteps = iosGuideAuto || showIphone
  const canToggle = !iosGuideAuto

  return (
    <>
      <PageHeader title="Cài app lên iPhone" backTo={paths.settings} />
      <div className="page install">
        {env.standalone && <InstalledCard />}
        {!env.standalone && env.inApp && <InAppCard env={env} />}

        {!env.standalone && !onIos && !showIphone && !env.inApp && (
          <OtherInstall canPrompt={canPrompt} android={env.platform === 'android'} />
        )}
        {!env.standalone && !onIos && !showIphone && env.inApp && (
          <p className="install-then">Sau khi mở bằng trình duyệt, bạn cài từ menu của trình duyệt.</p>
        )}

        {showIosSteps && (
          <>
            {iosGuideAuto && env.inApp && (
              <p className="install-then">Sau khi mở bằng Safari, làm theo 3 bước sau.</p>
            )}
            <IosSteps env={env} shownOnOtherDevice={!iosGuideAuto} />
          </>
        )}

        {canToggle && (
          <button
            type="button"
            className="btn btn--ghost install__toggle"
            aria-expanded={showIphone}
            onClick={() => setShowIphone((shown) => !shown)}
          >
            {showIphone ? 'Ẩn hướng dẫn cho iPhone' : 'Xem hướng dẫn cho iPhone'}
          </button>
        )}

        {!env.standalone && <WhyInstall env={env} />}
        <Remember />
      </div>
    </>
  )
}
