import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { parseDeepLink } from './deepLink.ts'

/**
 * Handles notification links (`/?tu=moi`, `/?tu=on`). While the URL carries a `tu` parameter the
 * routes are not rendered at all; a replace-navigation opens the target screen (or just removes
 * the parameter for an unknown value) and the routes render once the URL is clean. Because it
 * reacts to the router location, it also works when the URL changes while the app is open.
 */
export default function DeepLinkGate({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation()
  const link = parseDeepLink(search)
  if (!link.present) return children
  return <Navigate replace to={link.target ?? { pathname, search: link.search, hash }} />
}
