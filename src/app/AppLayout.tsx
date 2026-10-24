import { useEffect } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router'
import TabBar from './TabBar.tsx'

/** Page shell: scrolling content above a fixed bottom tab bar. */
export default function AppLayout() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  // New pages start at the top; back/forward (POP) keep the browser's own scroll position.
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])

  return (
    <div className="app">
      <main className="app-main">
        <Outlet />
      </main>
      <TabBar />
    </div>
  )
}
