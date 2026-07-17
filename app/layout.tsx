import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: {
    default: 'Pamoja — Free online memorial pages & digital condolence book',
    template: '%s · Pamoja',
  },
  description:
    'Create a free online memorial page: a digital condolence book to gather condolence messages, tributes, memories, funeral program details, and contributions — together in one place.',
  applicationName: 'Pamoja',
  ...(process.env.NEXT_PUBLIC_ROOT_DOMAIN
    ? { metadataBase: new URL(`https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) }
    : {}),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${inter.variable}`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
