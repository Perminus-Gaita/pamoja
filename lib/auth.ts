import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { Pool } from 'pg'

/*
 * Social sign-in providers are activated by simply setting their env vars.
 * Self-hosters register an OAuth app on each platform they want and provide
 * the credentials — anything left unset is silently unavailable.
 *
 * Callback URL to register on each platform:
 *   <BETTER_AUTH_URL>/api/auth/callback/<provider>
 */

type ProviderConfig = Record<string, Record<string, string>>

export const PROVIDER_ENV: Record<string, [string, string]> = {
  google:    ['GOOGLE_CLIENT_ID',    'GOOGLE_CLIENT_SECRET'],
  facebook:  ['FACEBOOK_CLIENT_ID',  'FACEBOOK_CLIENT_SECRET'],
  twitter:   ['TWITTER_CLIENT_ID',   'TWITTER_CLIENT_SECRET'],
  linkedin:  ['LINKEDIN_CLIENT_ID',  'LINKEDIN_CLIENT_SECRET'],
  tiktok:    ['TIKTOK_CLIENT_KEY',   'TIKTOK_CLIENT_SECRET'],
  github:    ['GITHUB_CLIENT_ID',    'GITHUB_CLIENT_SECRET'],
  apple:     ['APPLE_CLIENT_ID',     'APPLE_CLIENT_SECRET'],
  microsoft: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
  discord:   ['DISCORD_CLIENT_ID',   'DISCORD_CLIENT_SECRET'],
  spotify:   ['SPOTIFY_CLIENT_ID',   'SPOTIFY_CLIENT_SECRET'],
  twitch:    ['TWITCH_CLIENT_ID',    'TWITCH_CLIENT_SECRET'],
  reddit:    ['REDDIT_CLIENT_ID',    'REDDIT_CLIENT_SECRET'],
}

/** Providers whose env credentials are present on this deployment. */
export function configuredProviders(): string[] {
  return Object.entries(PROVIDER_ENV)
    .filter(([, [id, secret]]) => process.env[id] && process.env[secret])
    .map(([name]) => name)
}

function socialProviders(): ProviderConfig {
  const out: ProviderConfig = {}
  for (const name of configuredProviders()) {
    const [idVar, secretVar] = PROVIDER_ENV[name]
    out[name] = name === 'tiktok'
      ? { clientKey: process.env[idVar]!, clientSecret: process.env[secretVar]! }
      : { clientId: process.env[idVar]!, clientSecret: process.env[secretVar]! }
  }
  return out
}

function createAuth() {
  return betterAuth({
    database: new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
    }),
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: process.env.NEXT_PUBLIC_ROOT_DOMAIN
      ? [`https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`, `https://*.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`]
      : [],
    emailAndPassword: {
      enabled: true,
    },
    socialProviders: socialProviders(),
    plugins: [nextCookies()],
  })
}

let _auth: ReturnType<typeof createAuth> | null = null

export function auth() {
  if (!_auth) _auth = createAuth()
  return _auth
}
