import type { Metadata } from 'next'
import Pamoja from '@/components/pamoja'

export const metadata: Metadata = {
  title: 'Program',
  robots: { index: false, follow: true },
}

export default function ProgramPage() { return <Pamoja /> }
