// Shared chrome for the footer pages (/about, /faq, /terms, /contact).
// Server component — logo header linking home, content, and the same footer
// links as the directory landing.

import PamojaLogo from '@/components/pamoja-logo'

export default function DocShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="doc-page">
      <header className="doc-head">
        <a href="/" aria-label="Pamoja home"><PamojaLogo size={30} /></a>
      </header>
      <main className="doc-main">{children}</main>
      <footer className="doc-foot">
        Pamoja — <em>together</em>. A free, open-source digital condolence book.
        <nav className="dir-foot-links">
          <a href="/about">About</a>
          <a href="/faq">FAQ</a>
          <a href="/terms">Terms &amp; Conditions</a>
          <a href="/contact">Contact</a>
        </nav>
      </footer>
    </div>
  )
}
