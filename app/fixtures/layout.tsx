import { MockAuthProvider } from './MockAuthProvider'

export default function FixtureLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MockAuthProvider>{children}</MockAuthProvider>
}