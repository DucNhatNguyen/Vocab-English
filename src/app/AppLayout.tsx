import { useState } from 'react'
import PageTransition from './PageTransition.tsx'
import TabBar from './TabBar.tsx'
import { TabBarVisibilityContext } from './tabBarVisibility.ts'

/** Page shell: scrolling content above a fixed bottom tab bar (hidden during lessons). */
export default function AppLayout() {
  const [tabBarHidden, setTabBarHidden] = useState(false)

  return (
    <TabBarVisibilityContext.Provider value={setTabBarHidden}>
      <div className={tabBarHidden ? 'app app--immersive' : 'app'}>
        <main className="app-main">
          <PageTransition immersive={tabBarHidden} />
        </main>
        {!tabBarHidden && <TabBar />}
      </div>
    </TabBarVisibilityContext.Provider>
  )
}
