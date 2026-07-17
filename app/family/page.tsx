import type { Metadata } from 'next'
import Pamoja from '@/components/pamoja'

export const metadata: Metadata = {
  title: 'Relation tree',
  robots: { index: false, follow: true },
}

export default function FamilyPage() { return <Pamoja /> }
