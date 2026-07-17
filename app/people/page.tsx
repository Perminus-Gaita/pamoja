import type { Metadata } from 'next'
import Pamoja from '@/components/pamoja'

export const metadata: Metadata = {
  title: 'People',
  robots: { index: false, follow: true },
}

export default function PeoplePage() { return <Pamoja /> }
