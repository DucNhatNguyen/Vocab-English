import { createContext, useContext, useEffect } from 'react'

/** Lets a full-screen flow (lesson, review) hide the bottom tab bar while it is on screen. */
export const TabBarVisibilityContext = createContext<(hidden: boolean) => void>(() => {})

/** Hides the tab bar while `hidden` is true; shows it again on unmount. */
export function useHideTabBar(hidden: boolean): void {
  const setHidden = useContext(TabBarVisibilityContext)
  useEffect(() => {
    setHidden(hidden)
    return () => setHidden(false)
  }, [hidden, setHidden])
}
