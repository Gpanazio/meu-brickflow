import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined)

  React.useEffect(() => {
    // Ensure SSR safety by exiting early when `window` is unavailable.
    if (typeof window === "undefined") return

    const getIsMobile = () =>
      typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(getIsMobile())
    }
    mql.addEventListener("change", onChange)
    setIsMobile(getIsMobile())
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
