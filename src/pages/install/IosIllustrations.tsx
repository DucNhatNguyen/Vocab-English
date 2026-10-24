import { BookOpen, ChevronLeft, ChevronRight, Copy, Share, SquarePlus, X } from 'lucide-react'

/*
 * Hand-drawn stand-ins for the three iOS screens. Generic shapes only (no Apple screenshots or
 * logos); every colour comes from the design tokens through install.css, so they work in the
 * light and the "bảng đen" theme. The text matches the Vietnamese iOS UI.
 */

interface IllustrationProps {
  /** Describes the picture for screen readers. */
  label: string
}

/** Step 1: Safari's bottom toolbar, the Share button ringed. */
export function ShareButtonIllustration({ label }: IllustrationProps) {
  return (
    <svg className="ill" viewBox="0 0 320 190" role="img" aria-label={label}>
      {/* page content */}
      <rect className="ill__page" x="0" y="0" width="320" height="64" />
      <rect className="ill__skeleton" x="24" y="16" width="140" height="8" rx="4" />
      <rect className="ill__skeleton" x="24" y="34" width="220" height="6" rx="3" />
      <rect className="ill__skeleton" x="24" y="48" width="180" height="6" rx="3" />
      {/* browser chrome */}
      <rect className="ill__chrome" x="0" y="64" width="320" height="126" />
      <line className="ill__rule" x1="0" y1="64" x2="320" y2="64" />
      <rect className="ill__field" x="20" y="74" width="280" height="30" rx="15" />
      <rect className="ill__skeleton" x="112" y="86" width="96" height="6" rx="3" />
      {/* toolbar: back, forward, share, bookmarks, tabs */}
      <g className="ill__icon">
        <ChevronLeft x={20} y={116} width={24} height={24} />
        <ChevronRight x={84} y={116} width={24} height={24} opacity={0.4} />
        <Share x={148} y={116} width={24} height={24} />
        <BookOpen x={212} y={116} width={24} height={24} />
        <Copy x={276} y={116} width={24} height={24} />
      </g>
      {/* highlight */}
      <circle className="ill__ring" cx="160" cy="128" r="23" />
      <text className="ill__label" x="160" y="170" textAnchor="middle">
        Chia sẻ
      </text>
    </svg>
  )
}

/** Step 2: the share sheet, with the "Thêm vào MH chính" row marked. */
export function AddToHomeRowIllustration({ label }: IllustrationProps) {
  return (
    <svg className="ill" viewBox="0 0 320 190" role="img" aria-label={label}>
      <rect className="ill__sheet" x="14" y="12" width="292" height="190" rx="14" />
      {/* sheet header: app icon, name, close */}
      <rect className="ill__appicon" x="28" y="24" width="30" height="30" rx="7" />
      <text className="ill__icontext" x="43" y="45" textAnchor="middle">
        Từ
      </text>
      <text className="ill__text ill__text--strong" x="68" y="38">
        Từ Ngày
      </text>
      <rect className="ill__skeleton" x="68" y="45" width="74" height="5" rx="2.5" />
      <circle className="ill__field" cx="282" cy="39" r="12" />
      <X className="ill__icon" x={276} y={33} width={12} height={12} strokeWidth={2.5} />
      <line className="ill__rule" x1="14" y1="64" x2="306" y2="64" />
      {/* action rows */}
      <g className="ill__icon">
        <Copy x={28} y={78} width={20} height={20} />
        <SquarePlus x={28} y={118} width={20} height={20} />
        <BookOpen x={28} y={158} width={20} height={20} />
      </g>
      <text className="ill__text" x="62" y="93">
        Sao chép
      </text>
      <text className="ill__text" x="62" y="173">
        Thêm dấu trang
      </text>
      <line className="ill__rule" x1="62" y1="108" x2="306" y2="108" />
      <line className="ill__rule" x1="62" y1="148" x2="306" y2="148" />
      {/* highlighted row */}
      <rect className="ill__mark" x="20" y="110" width="280" height="36" rx="9" />
      <text className="ill__text ill__text--strong" x="62" y="133">
        Thêm vào MH chính
      </text>
    </svg>
  )
}

/** Step 3: the "Thêm vào MH chính" dialog with the "Thêm" button marked. */
export function AddButtonIllustration({ label }: IllustrationProps) {
  return (
    <svg className="ill" viewBox="0 0 320 190" role="img" aria-label={label}>
      <rect className="ill__sheet" x="14" y="12" width="292" height="166" rx="14" />
      {/* dialog header */}
      <text className="ill__text ill__text--accent" x="30" y="46">
        Hủy
      </text>
      <text className="ill__text ill__text--strong" x="148" y="46" textAnchor="middle">
        Thêm vào MH chính
      </text>
      <rect className="ill__mark" x="244" y="26" width="52" height="30" rx="15" />
      <text className="ill__text ill__text--accent ill__text--bold" x="270" y="46" textAnchor="middle">
        Thêm
      </text>
      <line className="ill__rule" x1="14" y1="68" x2="306" y2="68" />
      {/* the new icon and its name */}
      <rect className="ill__appicon" x="30" y="84" width="60" height="60" rx="14" />
      <text className="ill__icontext ill__icontext--big" x="60" y="123" textAnchor="middle">
        Từ
      </text>
      <rect className="ill__field" x="104" y="84" width="186" height="34" rx="8" />
      <text className="ill__text ill__text--strong" x="116" y="106">
        Từ Ngày
      </text>
      <rect className="ill__skeleton" x="104" y="128" width="120" height="6" rx="3" />
      <rect className="ill__skeleton" x="104" y="140" width="90" height="6" rx="3" />
    </svg>
  )
}
