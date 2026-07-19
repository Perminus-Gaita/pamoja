import type { Metadata } from 'next'
import MemorialsPage from '@/components/memorials-page'

export const metadata: Metadata = {
  title: 'Recent memorials',
  description: 'Recent memorial pages hosted on Pamoja — a free, open-source digital condolence book.',
  alternates: { canonical: '/memorials' },
  robots: { index: true, follow: true },
}

export default function Page() {
  return <MemorialsPage />
}
