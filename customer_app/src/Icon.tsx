import type { SVGProps } from 'react'
export type IconName =
  | 'home'
  | 'search'
  | 'orders'
  | 'cart'
  | 'user'
  | 'pin'
  | 'star'
  | 'clock'
  | 'back'
  | 'plus'
  | 'minus'
  | 'heart'
  | 'bell'
  | 'settings'
  | 'logout'
  | 'chevron'
  | 'close'
  | 'check'
  | 'download'
  | 'refresh'
  | 'wallet'
  | 'tag'
  | 'utensils'
  | 'truck'
const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v11h14V10M9 21v-7h6v7" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  orders: (
    <>
      <path d="M6 3h12l2 5H4l2-5Z" />
      <path d="M5 8v13h14V8M9 12h6M9 16h6" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2 11h10l3-8H6" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  back: <path d="m15 18-6-6 6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  heart: (
    <path d="M20.8 5.7a5.5 5.5 0 0 0-7.8 0L12 6.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.5a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 15.5 21 17l-4 4-1.5-2a8 8 0 0 1-3.5 1.5L11 23H6l-.5-2.5A8 8 0 0 1 2 18.5L1 15l2-1.5a8 8 0 0 1 0-4L1 8l3-4 2 1a8 8 0 0 1 4-1.5L11 1h5l.5 2.5A8 8 0 0 1 20 5l2 3-2 2a8 8 0 0 1-1 5.5Z" />
    </>
  ),
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M14 3h7v18h-7" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  check: <path d="m5 12 4 4L19 6" />,
  download: (
    <>
      <path d="M12 3v12m0 0 5-5m-5 5-5-5" />
      <path d="M5 21h14" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 6v5h-5" />
      <path d="M18.5 9A8 8 0 1 0 20 15" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="5" width="18" height="15" rx="3" />
      <path d="M16 12h5M3 9h15" />
    </>
  ),
  tag: (
    <>
      <path d="M20 13 13 20 4 11V4h7l9 9Z" />
      <circle cx="8" cy="8" r="1" />
    </>
  ),
  utensils: (
    <>
      <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M16 3v18M16 3c4 2 4 8 0 10" />
    </>
  ),
  truck: (
    <>
      <path d="M3 7h4l2 9h9l3-6h2V7H3Z" />
      <circle cx="8" cy="20" r="1" />
      <circle cx="17" cy="20" r="1" />
    </>
  ),
}
export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
