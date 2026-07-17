import type { Metadata } from 'next'
import Directory from '@/components/directory'

export const metadata: Metadata = {
  title: { absolute: 'Pamoja — Free online memorial pages & digital condolence book' },
  description:
    'Create a free online memorial page in minutes. Gather condolence messages, tributes, photo memories, the funeral program, and contributions — together in one place. Free and open source.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Pamoja — Free online memorial pages & digital condolence book',
    description:
      'A digital condolence book for someone you love: condolences, tributes, memories, funeral program, and contributions in one memorial page.',
    type: 'website',
    siteName: 'Pamoja',
  },
  robots: { index: true, follow: true },
}

export default function DirectoryPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Pamoja',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description:
      'Free, open-source online memorial pages and digital condolence book: condolences, tributes, memories, funeral program, and contributions.',
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Directory />
    </>
  )
}
