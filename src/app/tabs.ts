import { isSelfStudySearch } from '../lib/studySource.ts'
import { paths } from './paths.ts'

/** The three tabs of the tab bar. */
export type TabId = 'study' | 'self' | 'exercises'

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

const under = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`)

/**
 * Which tab a location belongs to. Tự học owns its tab, the own-word form, own-word details and the
 * `?nguon=tu-hoc` sessions; Bài tập owns its tab; everything else is reached from Học (home).
 */
export function activeTab(pathname: string, search: string): TabId {
  const path = normalize(pathname)
  if (under(path, paths.exercises)) return 'exercises'
  if (under(path, paths.selfStudy) || under(path, '/my-words')) return 'self'
  if (path.startsWith('/words/custom%3A') || path.startsWith('/words/custom:')) return 'self'
  if ((path === '/learn' || path === '/review') && isSelfStudySearch(search)) return 'self'
  return 'study'
}
