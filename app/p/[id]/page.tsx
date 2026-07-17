import type { Metadata } from 'next'
import PersonPage from '@/components/person-page'

// Personal profile — never indexed, generic title so no personal data leaks
// into search results.
export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PersonPage personId={id} />
}
