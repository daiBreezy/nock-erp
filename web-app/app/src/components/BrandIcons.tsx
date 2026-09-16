type Props = { size?: number; className?: string }

export function FacebookIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.43-4.94 8.43-9.94Z" />
    </svg>
  )
}

export function LineIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 3C6.9 3 2.75 6.4 2.75 10.58c0 3.75 3.3 6.88 7.75 7.47.3.06.71.2.82.46.1.24.06.6.03.84l-.13.8c-.04.24-.19.93.82.5 1-.42 5.4-3.18 7.37-5.45 1.36-1.49 2.01-3 2.01-4.62C21.25 6.4 17.1 3 12 3ZM8.2 13.1H6.36a.49.49 0 0 1-.49-.48V9.05a.49.49 0 0 1 .98 0v3.08H8.2a.49.49 0 0 1 0 .97Zm1.9-.48a.49.49 0 0 1-.97 0V9.05a.49.49 0 0 1 .97 0v3.57Zm4.3 0a.49.49 0 0 1-.34.46.5.5 0 0 1-.15.02.48.48 0 0 1-.4-.2l-1.83-2.49v2.21a.49.49 0 0 1-.98 0V9.05a.48.48 0 0 1 .34-.46.5.5 0 0 1 .55.18l1.84 2.49V9.05a.49.49 0 0 1 .97 0v3.57Zm3.1-2.27a.49.49 0 0 1 0 .97h-1.36v.83h1.36a.49.49 0 0 1 0 .97h-1.85a.49.49 0 0 1-.48-.48V9.05a.49.49 0 0 1 .48-.48h1.85a.49.49 0 0 1 0 .97H16.1v.83h1.36Z" />
    </svg>
  )
}

export function MessengerIcon({ size = 24, className }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.19.16.14.26.35.27.57l.05 1.78c.02.57.61.94 1.13.71l1.99-.88c.17-.07.36-.09.53-.04 1.03.28 2.13.43 3.27.43 5.64 0 10-4.13 10-9.7C22.32 6.13 17.64 2 12 2Zm6 7.46-2.94 4.67c-.47.74-1.47.93-2.18.4l-2.34-1.75a.6.6 0 0 0-.72 0l-3.16 2.4c-.42.32-.97-.18-.69-.63l2.94-4.67c.47-.74 1.47-.93 2.18-.4l2.34 1.75a.6.6 0 0 0 .72 0l3.16-2.4c.42-.32.97.18.69.63Z" />
    </svg>
  )
}
