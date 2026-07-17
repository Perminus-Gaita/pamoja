import type { Metadata } from 'next'
import Directory from '@/components/directory'

export const metadata: Metadata = {
  title: 'Pamoja — Free online memorial pages & digital condolence book',
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

const FAQ = [
  {
    q: 'How do I create an online memorial page?',
    a: 'Click "Create a memorial", add the name, dates, and a photo, and your memorial page is live on its own web address. You can then share the link with family and friends so they can sign the condolence book.',
  },
  {
    q: 'Is Pamoja really free?',
    a: 'Yes. Pamoja is free and open source. Creating a memorial, collecting condolences, and sharing the funeral program cost nothing.',
  },
  {
    q: 'Can people leave condolence messages online?',
    a: 'Yes — every memorial is a digital condolence book. Visitors can sign it from any phone or computer, and the family can enable moderation so messages are reviewed before they appear.',
  },
  {
    q: 'Can I share the funeral program online?',
    a: 'Yes. Each memorial has a program section for the order of service, venue, and timings, which you can restrict to signed-in or pre-approved guests.',
  },
  {
    q: 'Can I track funeral contributions?',
    a: 'Yes. The contributions section records support pledged and received (including mobile money like M-Pesa), visible only to the people you choose.',
  },
  {
    q: 'Is memorial content private?',
    a: 'You decide. Condolences can be public or sign-in only, while the program, relation tree, and contributions can be limited to approved guests. Individual condolences and personal data are never indexed by search engines.',
  },
]

export default function DirectoryPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Pamoja',
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description:
          'Free, open-source online memorial pages and digital condolence book: condolences, tributes, memories, funeral program, and contributions.',
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Directory />

      {/* Server-rendered so search engines see it without JavaScript */}
      <section className="dir-seo">
        <div className="dir-seo-inner">
          <h2>A free online memorial page for someone you love</h2>
          <p>
            Pamoja (Swahili for <em>together</em>) is a free, open-source digital condolence
            book. When someone passes away, their family creates a memorial page in minutes
            and shares one link — instead of scattered messages across WhatsApp, phone calls,
            and paper books, everything gathers in one gentle place.
          </p>

          <h2>Everything a grieving family needs, in one place</h2>
          <ul>
            <li><strong>Digital condolence book</strong> — friends sign from any phone; the family can review messages before they appear.</li>
            <li><strong>Tributes and memories</strong> — longer tributes and photo memories from the people who knew them best.</li>
            <li><strong>Funeral program online</strong> — order of service, venue, and timings, shareable with exactly the guests you choose.</li>
            <li><strong>Contribution tracking</strong> — record support pledged and received, including mobile money, visible only to those you approve.</li>
            <li><strong>Relation tree</strong> — how everyone is connected to the person being remembered.</li>
            <li><strong>Privacy first</strong> — you control who sees what, and personal content is never indexed by search engines.</li>
          </ul>

          <h2>Frequently asked questions</h2>
          {FAQ.map(f => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}
