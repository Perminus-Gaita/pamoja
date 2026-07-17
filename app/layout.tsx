import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter, Poppins } from 'next/font/google'
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

// Logo wordmark only (PamojaLogo reads var(--font-poppins))
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Pamoja — Free online memorial pages & digital condolence book',
    template: '%s · Pamoja',
  },
  description:
    'Create a free online memorial page: a digital condolence book to gather condolence messages, tributes, memories, funeral program details, and contributions — together in one place.',
  applicationName: 'Pamoja',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    siteName: 'Pamoja',
    images: ['/og.png'],
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
  ...(process.env.NEXT_PUBLIC_ROOT_DOMAIN
    ? { metadataBase: new URL(`https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) }
    : {}),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${cormorant.variable} ${inter.variable} ${poppins.variable}`}>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
