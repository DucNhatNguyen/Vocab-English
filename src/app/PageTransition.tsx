import { AnimatePresence, m, useReducedMotion, type Variants } from 'motion/react'
import { useEffect, useLayoutEffect, useState } from 'react'
import { useLocation, useNavigationType, useOutlet } from 'react-router'
import {
  classifyNavigation,
  pageTarget,
  sectionKey,
  type PageMotionCustom,
  type TransitionKind,
} from './pageTransition.ts'

const VARIANTS: Variants = {
  enter: (custom: PageMotionCustom) => pageTarget('enter', custom),
  center: (custom: PageMotionCustom) => pageTarget('center', custom),
  exit: (custom: PageMotionCustom) => pageTarget('exit', custom),
}

interface Track {
  section: string
  kind: TransitionKind
  flatExit: boolean
}

type ScrollPositions = Map<string, number>

/** Scrolls to the top for a new page, or puts a page reached with back/forward where it was. */
function ScrollOnMount({
  positions,
  locationKey,
  restore,
}: {
  positions: ScrollPositions
  locationKey: string
  restore: boolean
}) {
  useLayoutEffect(() => {
    const target = restore ? (positions.get(locationKey) ?? 0) : 0
    window.scrollTo(0, target)
    if (target <= 0) return

    // The page may still be filling up (data loads asynchronously), so keep nudging for a moment
    // until the position is reachable, and stop as soon as the user takes over.
    let frame = 0
    const started = performance.now()
    const tick = () => {
      if (Math.abs(window.scrollY - target) < 2 || performance.now() - started > 800) return
      window.scrollTo(0, target)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const stop = () => cancelAnimationFrame(frame)
    const events = ['touchstart', 'wheel', 'keydown'] as const
    for (const name of events) window.addEventListener(name, stop, { once: true, passive: true })
    return () => {
      stop()
      for (const name of events) window.removeEventListener(name, stop)
    }
    // runs once, when the page mounts
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

/**
 * Animated outlet. Pages are keyed by pathname (not by search params), so only real page changes
 * animate. `mode="wait"` plays the old page's short exit in place, then mounts the new page: no
 * absolutely positioned leftovers, no overlap and no scroll jump (the scroll reset or restore
 * happens when the new page mounts). The outgoing route stays frozen because `useOutlet()`'s
 * element is kept by AnimatePresence.
 */
export default function PageTransition({ immersive }: { immersive: boolean }) {
  const outlet = useOutlet()
  const location = useLocation()
  const navType = useNavigationType()
  const reduced = useReducedMotion() ?? false
  const section = sectionKey(location.pathname)

  const [track, setTrack] = useState<Track>({ section, kind: 'tab', flatExit: false })
  if (track.section !== section) {
    // `immersive` still describes the outgoing page here: it is only unmounted after its exit
    setTrack({
      section,
      kind: classifyNavigation(track.section, section, navType),
      flatExit: immersive,
    })
  }

  // Browser scroll restoration runs on popstate, while the old page is still showing: take over.
  const [positions] = useState<ScrollPositions>(() => new Map())
  useEffect(() => {
    const previous = history.scrollRestoration
    history.scrollRestoration = 'manual'
    return () => {
      history.scrollRestoration = previous
    }
  }, [])
  // The cleanup runs when the location changes, before the new page has touched the scroll.
  useLayoutEffect(() => {
    const key = location.key
    return () => {
      positions.set(key, window.scrollY)
    }
  }, [location.key, positions])

  const custom: PageMotionCustom = { kind: track.kind, reduced, flatExit: track.flatExit }

  return (
    <AnimatePresence mode="wait" initial={false} custom={custom}>
      <m.div
        key={section}
        className="route-page"
        custom={custom}
        variants={VARIANTS}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <ScrollOnMount
          positions={positions}
          locationKey={location.key}
          restore={navType === 'POP'}
        />
        {outlet}
      </m.div>
    </AnimatePresence>
  )
}
