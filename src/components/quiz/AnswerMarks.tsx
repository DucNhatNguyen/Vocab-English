import { useLayoutEffect, useRef, useState } from 'react'

/** Red-pen tick that draws itself (CSS stroke animation; static under reduced motion). */
export function RedTick({ className }: { className?: string }) {
  return (
    <svg
      className={className ? `red-tick ${className}` : 'red-tick'}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path pathLength="1" d="M5 17.5 L12 25 C15 17 20 11 28 5.5" />
    </svg>
  )
}

interface StrikeLine {
  left: number
  top: number
  width: number
}

// Two slightly different hand-drawn strokes (x in 0-100, y in 0-10), alternated between lines
const STRIKE_SHAPES: ReadonlyArray<readonly number[]> = [
  [1, 6, 25, 3, 50, 8, 99, 4],
  [1, 4, 30, 8, 60, 2, 99, 6],
]

/**
 * Stroke path in pixel units (x scaled from the 0-100 template to `width`). Drawn in real
 * pixels, without a stretched viewBox or non-scaling stroke, so `pathLength` and the dash
 * animation cover the whole line.
 */
function strikePath(shape: readonly number[], width: number): string {
  const x = (v: number) => Math.round((v / 100) * width * 10) / 10
  const [x0, y0, x1, y1, x2, y2, x3, y3] = shape
  return `M${x(x0)} ${y0} C ${x(x1)} ${y1}, ${x(x2)} ${y2}, ${x(x3)} ${y3}`
}

/**
 * Text struck through by a red pen: one animated stroke per rendered line, so wrapped text
 * is crossed out line by line. The text itself stays readable.
 */
export function StruckText({ children }: { children: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [lines, setLines] = useState<StrikeLine[]>([])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    function measure() {
      if (!el) return
      const origin = el.getBoundingClientRect()
      const range = document.createRange()
      // Only the text node: the strike <svg>s inside `el` would otherwise be measured as lines
      const text = el.firstChild
      if (!text) return
      range.selectNodeContents(text)
      const next = Array.from(range.getClientRects())
        .filter((r) => r.width > 1 && r.height > 1)
        .map((r) => ({
          left: r.left - origin.left,
          top: r.top - origin.top + r.height * 0.54,
          width: r.width,
        }))
      setLines((prev) => (sameLines(prev, next) ? prev : next))
    }

    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [children])

  return (
    <span ref={ref} className="struck">
      {children}
      {lines.map((line, i) => (
        <svg
          key={i}
          className="red-strike"
          style={{
            left: line.left,
            top: line.top,
            width: line.width,
            animationDelay: `${i * 0.12}s`,
          }}
          viewBox={`0 0 ${line.width} 10`}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path
            pathLength="1"
            d={strikePath(STRIKE_SHAPES[i % STRIKE_SHAPES.length], line.width)}
            style={{ animationDelay: `${i * 0.12 + 0.05}s` }}
          />
        </svg>
      ))}
    </span>
  )
}

function sameLines(a: readonly StrikeLine[], b: readonly StrikeLine[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (l, i) =>
        Math.abs(l.left - b[i].left) < 0.5 &&
        Math.abs(l.top - b[i].top) < 0.5 &&
        Math.abs(l.width - b[i].width) < 0.5,
    )
  )
}
