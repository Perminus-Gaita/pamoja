import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Pamoja from '@/components/pamoja'
import { memorialForRequest, toIsoDate } from '@/lib/seo'

// Memorial hosts land here directly; the main domain reaches this page via
// the middleware rewrites for /memorial/<slug> and /demo/<slug> (root-domain
// "/" goes to /directory instead). Search engines get the deceased's name and
// dates here and nothing else; condolences and all memorial data load
// client-side and the section routes are noindexed.
export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? ''
  const m = await memorialForRequest()
  if (!m) {
    return { title: 'Pamoja — Digital condolence book', robots: { index: true, follow: true } }
  }
  const dates = [m.born, m.passed].filter(Boolean).join(' – ')
  const title = dates ? `${m.name} (${dates}) — Memorial` : `${m.name} — Memorial`
  const description = `In loving memory of ${m.name}${dates ? `, ${dates}` : ''}. Visit the memorial to sign the condolence book and share a message of support with the family.`
  const url = host ? `https://${host.split(':')[0]}${m.basePath}/` : undefined
  return {
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: { title, description, url, type: 'profile', siteName: 'Pamoja' },
    twitter: { card: 'summary', title, description },
    robots: { index: true, follow: true },
  }
}

export default async function Home() {
  const m = await memorialForRequest()
  const jsonLd = m
    ? {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: m.name,
        ...(toIsoDate(m.born) ? { birthDate: toIsoDate(m.born) } : {}),
        ...(toIsoDate(m.passed) ? { deathDate: toIsoDate(m.passed) } : {}),
        subjectOf: {
          '@type': 'WebPage',
          name: `Memorial for ${m.name}`,
          description: 'Digital condolence book and memorial page.',
        },
      }
    : null
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Pamoja />
    </>
  )
}
