import type { TargetAndTransition } from 'motion/react'
import { paths } from './paths.ts'

/**
 * Pure helpers for route transitions: how a navigation is classified and which motion targets
 * each kind uses. No React and no runtime motion code, so it is unit-testable.
 */

/** tab: crossfade between top-level tabs. push: drilling deeper. pop: going back. */
export type TransitionKind = 'tab' | 'push' | 'pop'

export type NavType = 'PUSH' | 'POP' | 'REPLACE'

const TAB_ROOTS: readonly string[] = [paths.home, paths.selfStudy, paths.exercises]

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

export function isTabRoot(pathname: string): boolean {
  return TAB_ROOTS.includes(normalize(pathname))
}

/** 0 for a tab root, otherwise the number of path segments ("/stats" = 1, "/words/x" = 2). */
function depth(pathname: string): number {
  if (isTabRoot(pathname)) return 0
  return normalize(pathname).split('/').filter(Boolean).length
}

/**
 * Identity of a routed page: the pathname without a trailing slash. Search params and hashes are
 * not part of it, so typing in the search box (`?q=`) never remounts the page.
 */
export function sectionKey(pathname: string): string {
  return normalize(pathname)
}

/** Decides which transition a move from one path to another gets. */
export function classifyNavigation(from: string, to: string, navType: NavType): TransitionKind {
  if (isTabRoot(to) && (navType !== 'POP' || isTabRoot(from))) return 'tab'
  const fromDepth = depth(from)
  const toDepth = depth(to)
  if (navType === 'POP') return fromDepth < toDepth ? 'push' : 'pop' // forward vs back button
  // a replace to a shallower page (e.g. after deleting a word) reads as "back"
  if (navType === 'REPLACE' && toDepth < fromDepth) return 'pop'
  return 'push'
}

/** Passed as `custom` to the page wrapper and to AnimatePresence (so the exiting page sees it too). */
export interface PageMotionCustom {
  kind: TransitionKind
  reduced: boolean
  /** The outgoing page is an immersive session with fixed bars: it may only fade, never move. */
  flatExit: boolean
}

export type PagePhase = 'enter' | 'center' | 'exit'

type Bezier = [number, number, number, number]

export type PageTarget = TargetAndTransition & {
  opacity: number
  x?: number
  y?: number
  transition: { duration: number; ease: Bezier }
}

const EASE_OUT: Bezier = [0.22, 1, 0.36, 1]
const EASE_IN: Bezier = [0.4, 0, 1, 1]

/** Distances in px. */
export const PUSH_ENTER_X = 28
export const PUSH_EXIT_X = -16

/**
 * Motion target of one phase. `enter` is the starting state of the incoming page, `center` the
 * resting state, `exit` the end state of the outgoing page. The pages run one after the other
 * (AnimatePresence "wait"), so the exits are kept short.
 */
export function pageTarget(phase: PagePhase, custom: PageMotionCustom): PageTarget {
  const { kind, reduced, flatExit } = custom

  if (reduced) {
    return phase === 'exit'
      ? { opacity: 0, transition: { duration: 0.08, ease: EASE_IN } }
      : { opacity: phase === 'center' ? 1 : 0, transition: { duration: 0.15, ease: EASE_OUT } }
  }

  if (phase === 'center') {
    return {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: kind === 'tab' ? 0.17 : 0.26, ease: EASE_OUT },
    }
  }

  if (phase === 'enter') {
    const transition = { duration: 0.2, ease: EASE_OUT }
    if (kind === 'tab') return { opacity: 0, y: 8, transition }
    // push comes in from the right, pop (going back) from the left
    return { opacity: 0, x: kind === 'push' ? PUSH_ENTER_X : PUSH_EXIT_X, transition }
  }

  // exit
  if (kind === 'tab' || flatExit) {
    return { opacity: 0, transition: { duration: 0.08, ease: EASE_IN } }
  }
  return {
    opacity: 0,
    x: kind === 'push' ? PUSH_EXIT_X : PUSH_ENTER_X,
    transition: { duration: 0.1, ease: EASE_IN },
  }
}
