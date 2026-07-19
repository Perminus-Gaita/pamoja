// Footer GitHub + sponsors links, rendered inside the .dir-foot-links nav of
// the directory landing and the doc pages — same styling as the other footer
// links. The star count is fetched by the server component that renders it
// (see lib/github.ts); stars === null (API failure) renders "GitHub" alone.

import { GITHUB_REPO_URL, GITHUB_SPONSORS_URL, formatStars } from '@/lib/github'

export default function FooterMeta({ stars }: { stars: number | null }) {
  return (
    <>
      <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
        GitHub{stars !== null ? ` ★ ${formatStars(stars)}` : ''}
      </a>
      <a href={GITHUB_SPONSORS_URL} target="_blank" rel="noopener noreferrer">Support</a>
    </>
  )
}
