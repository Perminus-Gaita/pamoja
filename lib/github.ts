// GitHub repo metadata for the footer. The star count is fetched server-side
// with a 1-hour revalidate so there is one outbound request per window, not
// one per visitor (unauthenticated GitHub API allows 60 req/hr/IP).

const REPO = 'Perminus-Gaita/pamoja'

export const GITHUB_REPO_URL = `https://github.com/${REPO}`
export const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/Perminus-Gaita'

export async function getRepoStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data.stargazers_count === 'number' ? data.stargazers_count : null
  } catch {
    return null
  }
}

export function formatStars(n: number): string {
  if (n < 1000) return String(n)
  const k = n / 1000
  return (k >= 10 ? Math.round(k).toString() : k.toFixed(1).replace(/\.0$/, '')) + 'k'
}
