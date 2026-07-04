import type { Metadata } from 'next'
import Directory from '@/components/directory'

export const metadata: Metadata = {
  title: 'Pamoja — Together in remembrance',
  description: 'Memorials for those we love — condolences, memories, and support, together.',
}

export default function DirectoryPage() {
  return <Directory />
}
