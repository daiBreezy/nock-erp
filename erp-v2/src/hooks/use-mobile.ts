import * as React from "react"

const MOBILE_BREAKPOINT = 768
const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(query)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

// owner 2026-11-02: panels slide up from the bottom on phones AND tablet-portrait; only a wide landscape
// screen (iPad landscape / desktop, ≥1024px) gets the right-hand side panel.
const sideQuery = "(min-width: 1024px)"
function subscribeSide(onChange: () => void) {
  const mql = window.matchMedia(sideQuery)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}
/** true when a sheet should be a right-hand side panel; false → a bottom sheet. */
export function useSidePanel() {
  return React.useSyncExternalStore(subscribeSide, () => window.matchMedia(sideQuery).matches, () => false)
}
