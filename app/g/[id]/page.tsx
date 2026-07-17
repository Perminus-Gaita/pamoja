import type { Metadata } from 'next'
import GroupPage from '@/components/group-page'

export const metadata: Metadata = {
  title: 'Group',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <GroupPage groupId={id} />
}
