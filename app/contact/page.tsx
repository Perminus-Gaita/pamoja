import type { Metadata } from 'next'
import DocShell from '@/components/doc-shell'
import ContactForm from '@/components/contact-form'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Pamoja — questions, help with a memorial, or feedback.',
  alternates: { canonical: '/contact' },
  robots: { index: true, follow: true },
}

export default function ContactPage() {
  return (
    <DocShell>
      <h1>Contact us</h1>
      <p>
        Questions about a memorial, need help getting set up, or just want to share
        feedback? Leave your details below and we will get back to you — usually within
        a day.
      </p>
      <ContactForm />
    </DocShell>
  )
}
