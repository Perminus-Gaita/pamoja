import type { Metadata } from 'next'
import DocShell from '@/components/doc-shell'

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Frequently asked questions about Pamoja — creating a free online memorial page, condolence messages, sharing the funeral program, tracking contributions, and privacy.',
  alternates: { canonical: '/faq' },
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

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <DocShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1>Frequently asked questions</h1>
      {FAQ.map(f => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
      <p style={{ marginTop: 24 }}>
        Something else on your mind? <a href="/contact">Contact us</a>.
      </p>
    </DocShell>
  )
}
