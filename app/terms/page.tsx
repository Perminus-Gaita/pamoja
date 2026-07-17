import type { Metadata } from 'next'
import DocShell from '@/components/doc-shell'

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions for using Pamoja, the free open-source digital condolence book.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <DocShell>
      <h1>Terms &amp; Conditions</h1>
      <p>
        Pamoja is a free, open-source digital condolence book. By creating a memorial or
        posting on one, you agree to these terms. They are written to be read by people,
        not lawyers — the short version: be kind, respect the bereaved, and remember this
        is a free community service offered in good faith.
      </p>

      <h2>1. The service</h2>
      <p>
        Pamoja lets families create memorial pages that gather condolences, tributes,
        memories, program information, and contribution records. The service is provided
        free of charge, as-is, with no guarantee of uninterrupted availability.
      </p>

      <h2>2. Your account and content</h2>
      <ul>
        <li>You are responsible for what you post. Condolences, tributes, and memories must be respectful — this is a space for grieving families.</li>
        <li>You confirm you have the right to share any photos or text you upload.</li>
        <li>The family that creates a memorial administers it and may moderate, hide, or remove content on it.</li>
        <li>We may remove content or accounts that are abusive, unlawful, or that disrespect the purpose of the service.</li>
      </ul>

      <h2>3. Memorial data and deletion</h2>
      <ul>
        <li>Memorial admins control who can see each section (condolences, program, contributions, relation tree).</li>
        <li>Personal memorial content is never submitted to search engines for indexing; only the name and dates of the person remembered appear in public search listings.</li>
        <li>Deleted items are kept for 90 days so mistakes can be undone, then permanently purged.</li>
      </ul>

      <h2>4. Contributions</h2>
      <p>
        Contribution records on a memorial are a bookkeeping aid for the family. Pamoja
        does not process payments and is not a party to any contribution made between
        you and a family.
      </p>

      <h2>5. Liability</h2>
      <p>
        Pamoja is provided &ldquo;as is&rdquo;, without warranties of any kind. To the fullest
        extent permitted by law, we accept no liability for loss or damage arising from
        use of the service, including loss of content — though we work hard to keep
        everything safe.
      </p>

      <h2>6. Changes</h2>
      <p>
        We may update these terms as the service evolves; the latest version always
        lives on this page. Questions? <a href="/contact">Contact us</a>.
      </p>
    </DocShell>
  )
}
