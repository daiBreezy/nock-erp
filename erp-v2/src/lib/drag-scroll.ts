/** pure bits of the app-wide "hold the mouse and drag to scroll" (owner 2026-11-27) */

/** a press only becomes a drag once it has moved this far — below it, it is still a click */
export const PAN_THRESHOLD = 4
export const exceedsThreshold = (dx: number, dy: number, limit = PAN_THRESHOLD) => Math.hypot(dx, dy) > limit

/** where a scroller ends up when the pointer moved by `delta` (dragging right moves the content right = scroll LEFT), kept inside [0, max] */
export const panTo = (start: number, delta: number, max: number) => Math.min(Math.max(start - delta, 0), Math.max(max, 0))

/** form controls / editable text / things that drag on their own keep their own mouse behaviour */
export const PAN_BLOCK_SELECTOR = 'input, textarea, select, option, [contenteditable=""], [contenteditable="true"], [draggable="true"], [role="slider"], [data-no-pan], [data-pan], video, audio'
