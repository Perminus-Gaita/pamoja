import type { Metadata } from 'next'
import Pamoja from '@/components/pamoja'

export const metadata: Metadata = {
  title: 'Contributions',
  robots: { index: false, follow: true },
}

export default function ContributionsPage() { return <Pamoja /> }
