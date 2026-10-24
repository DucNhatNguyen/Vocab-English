import { Bell, BellOff, BellRing, Smartphone, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { paths } from '../../app/paths.ts'
import { useInstallEnvironment } from '../../app/useInstall.ts'
import { usePushState } from '../../app/usePush.ts'
import { formatIosVersion, type InstallEnvironment } from '../../lib/install.ts'
import { disablePush, enablePush, isPushConfigured, pushView, type PushView } from '../../lib/notifications.ts'

function StatusRow({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="setting setting--status">
      <Icon size={20} className="setting__status-icon" aria-hidden="true" />
      <span>{children}</span>
    </li>
  )
}

function blockedHelp(env: InstallEnvironment): string {
  return env.platform === 'ios'
    ? 'Thông báo của Từ Ngày đang bị tắt. Để bật lại: mở Cài đặt của iPhone, chọn Thông báo, chọn Từ Ngày rồi bật Cho phép thông báo.'
    : 'Thông báo đang bị chặn. Để bật lại: bấm biểu tượng ổ khóa cạnh địa chỉ trang, chọn Cài đặt trang web rồi cho phép Thông báo.'
}

/**
 * Rows under the Sáng / Trưa / Tối switches: whether reminders can work on this device and the
 * button that turns them on or off. The permission dialog is requested straight from the tap
 * (iOS shows it only for a user gesture).
 */
export default function PushRows({ anyReminder }: { anyReminder: boolean }) {
  const env = useInstallEnvironment()
  const state = usePushState()
  const view: PushView = pushView(isPushConfigured(), env, state)

  switch (view) {
    case 'not-configured':
      return (
        <StatusRow icon={BellOff}>
          Thông báo nhắc học chưa được bật ở bản này. Các lựa chọn Sáng, Trưa, Tối ở trên vẫn được lưu trên máy.
        </StatusRow>
      )
    case 'ios-install':
      return (
        <>
          <StatusRow icon={Smartphone}>
            Trên iPhone, thông báo chỉ hoạt động khi bạn đã thêm Từ Ngày vào Màn hình chính và mở app từ biểu
            tượng đó.
          </StatusRow>
          <li className="setting">
            <Link to={paths.install} className="btn btn--ghost">
              Xem cách cài app
            </Link>
          </li>
        </>
      )
    case 'ios-unsupported':
      return (
        <StatusRow icon={BellOff}>
          iPhone cần iOS 16.4 trở lên để nhận thông báo
          {env.iosVersion ? ` (máy bạn đang dùng iOS ${formatIosVersion(env.iosVersion)})` : ''}. Hãy cập nhật iOS
          rồi quay lại đây.
        </StatusRow>
      )
    case 'no-push':
      return (
        <StatusRow icon={BellOff}>
          Trình duyệt này chưa hỗ trợ thông báo. Hãy mở Từ Ngày bằng Chrome, Edge hoặc Safari bản mới.
        </StatusRow>
      )
    case 'blocked':
      return <StatusRow icon={BellOff}>{blockedHelp(env)}</StatusRow>
    case 'checking':
      return <StatusRow icon={Bell}>Đang kiểm tra thông báo…</StatusRow>
    case 'error':
      return (
        <>
          <StatusRow icon={TriangleAlert}>
            Chưa kết nối được dịch vụ thông báo. Hãy kiểm tra mạng rồi thử lại.
          </StatusRow>
          <li className="setting">
            <button type="button" className="btn btn--ghost" disabled={state.busy} onClick={() => void enablePush()}>
              {state.busy ? 'Đang thử lại…' : 'Thử lại'}
            </button>
          </li>
        </>
      )
    case 'off':
      return (
        <>
          <StatusRow icon={Bell}>
            {anyReminder
              ? 'Bật nhắc học để nhận thông báo vào các buổi đã chọn ở trên.'
              : 'Chọn buổi bạn muốn được nhắc ở trên, rồi bật nhắc học.'}
          </StatusRow>
          <li className="setting">
            <button type="button" className="btn btn--primary" disabled={state.busy} onClick={() => void enablePush()}>
              <Bell size={20} aria-hidden="true" />
              {state.busy ? 'Đang bật…' : 'Bật nhắc học'}
            </button>
          </li>
        </>
      )
    case 'on':
      return (
        <>
          <StatusRow icon={BellRing}>
            Nhắc học đang bật.{' '}
            {anyReminder
              ? 'Bạn sẽ nhận thông báo vào các buổi đã chọn ở trên.'
              : 'Chưa chọn buổi nào ở trên nên chưa có thông báo nào được gửi.'}
          </StatusRow>
          <li className="setting">
            <button type="button" className="btn btn--ghost" disabled={state.busy} onClick={() => void disablePush()}>
              <BellOff size={20} aria-hidden="true" />
              {state.busy ? 'Đang tắt…' : 'Tắt nhắc học'}
            </button>
          </li>
        </>
      )
  }
}
