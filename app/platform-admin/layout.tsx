import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Platform admin',
  robots: { index: false, follow: false },
}

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
