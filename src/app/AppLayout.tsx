import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router'
import TabBar from './TabBar.tsx'
import { TabBarVisibilityContext } from './tabBarVisibility.ts'

/** Page shell: scrolling content above a fixed bottom tab bar (hidden during lessons). */
export default function AppLayout() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  const [tabBarHidden, setTabBarHidden] = useState(false)

  // New pages start at the top; back/forward (POP) keep the browser's own scroll position.
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0)
  }, [pathname, navigationType])

  return (
    <TabBarVisibilityContext.Provider value={setTabBarHidden}>
      <div className={tabBarHidden ? 'app app--immersive' : 'app'}>
        <main className="app-main">
          <Outlet />
        </main>
        {!tabBarHidden && <TabBar />}
      </div>
    </TabBarVisibilityContext.Provider>
  )
}
