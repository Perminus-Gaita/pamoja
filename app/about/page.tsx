import type { Metadata } from 'next'
import DocShell from '@/components/doc-shell'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Pamoja (Swahili for together) is a free, open-source digital condolence book — a memorial page gathering condolences, tributes, memories, the funeral program, and contributions in one place.',
  alternates: { canonical: '/about' },
  robots: { index: true, follow: true },
}

export default function AboutPage() {
  return (
    <DocShell>
      <h1>A free online memorial page for someone you love</h1>
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

      <h2>Free and open source</h2>
      <p>
        Pamoja costs nothing to use. The code is open source, so anyone can inspect how
        it works or host their own copy. Have a question or need help?{' '}
        <a href="/contact">Get in touch</a>.
      </p>

      <h2>Credits</h2>
      <p>
        The hug and heart in the Pamoja logo use Twemoji artwork (© X/Twitter and
        contributors, CC-BY 4.0). The wordmark is set in Poppins (© Indian Type Foundry,
        SIL Open Font License 1.1).
      </p>
    </DocShell>
  )
}
