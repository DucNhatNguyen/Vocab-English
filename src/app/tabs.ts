import { paths } from './paths.ts'

/** The two tabs of the tab bar. */
export type TabId = 'words' | 'exercises'

function normalize(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
}

const under = (pathname: string, root: string) => pathname === root || pathname.startsWith(`${root}/`)

/** Which tab a location belongs to. Bài tập owns its tab; everything else is reached from Từ của tôi. */
export function activeTab(pathname: string): TabId {
  return under(normalize(pathname), paths.exercises) ? 'exercises' : 'words'
}
