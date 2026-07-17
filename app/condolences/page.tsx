import type { Metadata } from 'next'
import Pamoja from '@/components/pamoja'

// Individual condolences are personal — never indexed.
export const metadata: Metadata = {
  title: 'Condolences',
  robots: { index: false, follow: true },
}

export default function CondolencesPage() { return <Pamoja /> }
