import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'orders'
  | 'menu'
  | 'sales'
  | 'settings'
  | 'bell'
  | 'plus'
  | 'refresh'
  | 'search'
  | 'close'
  | 'logout'
  | 'store'
  | 'clock'
  | 'check'
  | 'edit'
  | 'trash'
  | 'wifi'
  | 'offline'
  | 'download'
  | 'chevron'

const paths: Record<IconName, React.ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
      <path d="M9 21v-7h6v7" />
    </>
  ),
  orders: (
    <>
      <path d="M6 3h12l2 5H4l2-5Z" />
      <path d="M5 8v13h14V8" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  menu: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="7" cy="6" r="1" />
      <circle cx="7" cy="12" r="1" />
      <circle cx="7" cy="18" r="1" />
    </>
  ),
  sales: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5 1H3v-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3h4v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.5 1h.1v4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  refresh: (
    <>
      <path d="M20 6v5h-5" />
      <path d="M18.5 9A8 8 0 1 0 20 15" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  logout: (
    <>
      <path d="M10 17l5-5-5-5M15 12H3" />
      <path d="M14 3h7v18h-7" />
    </>
  ),
  store: (
    <>
      <path d="M3 9h18l-2-5H5L3 9Z" />
      <path d="M5 9v11h14V9M9 20v-6h6v6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  edit: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13 7 4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
    </>
  ),
  wifi: (
    <>
      <path d="M4 9a12 12 0 0 1 16 0M7 13a8 8 0 0 1 10 0M10 17a3 3 0 0 1 4 0" />
      <circle cx="12" cy="20" r=".5" />
    </>
  ),
  offline: (
    <>
      <path d="m3 3 18 18M7 13a8 8 0 0 1 4-2M4 9a12 12 0 0 1 3-2M14 11a8 8 0 0 1 3 2M13 17a3 3 0 0 0-3 0" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12m0 0 5-5m-5 5-5-5" />
      <path d="M5 21h14" />
    </>
  ),
  chevron: <path d="m9 18 6-6-6-6" />,
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
