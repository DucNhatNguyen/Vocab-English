import { paths } from './paths.ts'

/** Screens a notification can open, by the value of the `tu` query parameter (spec 6.8). */
export const DEEP_LINK_PARAM = 'tu'

const TARGETS: Readonly<Record<string, string>> = {
  moi: paths.learn,
  on: paths.review,
}

export interface DeepLink {
  /** The URL carries a `tu` parameter (valid or not), so it has to be consumed. */
  present: boolean
  /** Screen to open; null for an unknown value (the user stays where they are). */
  target: string | null
  /** The query string without `tu`, including the leading "?" ("" when nothing is left). */
  search: string
}

/** Reads `?tu=moi` / `?tu=on` from a location search string. Pure. */
export function parseDeepLink(search: string): DeepLink {
  const params = new URLSearchParams(search)
  if (!params.has(DEEP_LINK_PARAM)) return { present: false, target: null, search }
  const value = params.get(DEEP_LINK_PARAM) ?? ''
  params.delete(DEEP_LINK_PARAM)
  const rest = params.toString()
  return {
    present: true,
    target: Object.hasOwn(TARGETS, value) ? TARGETS[value] : null,
    search: rest ? `?${rest}` : '',
  }
}
