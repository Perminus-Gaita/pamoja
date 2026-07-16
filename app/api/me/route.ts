import { NextResponse } from 'next/server'
import { getViewer, getAccessSettings, canView } from '@/lib/access'
import { configuredProviders } from '@/lib/auth'
import { allFeatures, deploymentMode } from '@/lib/entitlements'
import { db, withRetry } from '@/lib/db'
import { CONFIG } from '@/lib/config'

export const dynamic = 'force-dynamic'

// Everything the client needs to render the right UI for this visitor.
// Access flags already combine the admin's visibility settings with the
// deployment's entitlements (self-host = everything enabled).
export async function GET() {
  const [viewer, settings, features] = await Promise.all([
    getViewer(),
    getAccessSettings(),
    allFeatures(),
  ])
  const sql = await db()
  const rows = await withRetry(() =>
    sql`SELECT key, value FROM settings WHERE key IN ('cfg.socialLinks', 'auth.providers', 'cfg.whatsapp')`
  )
  const s: Record<string, string> = {}
  for (const r of rows) s[r.key as string] = r.value as string

  let socialLinks: Array<{ platform: string; label: string; url: string }> = []
  try { socialLinks = s['cfg.socialLinks'] ? JSON.parse(s['cfg.socialLinks']) : [] } catch {}
  // Legacy fallback: the old single WhatsApp link setting
  if (socialLinks.length === 0) {
    const wa = s['cfg.whatsapp'] ?? CONFIG.whatsapp
    if (wa && !wa.includes('XXXX')) socialLinks = [{ platform: 'whatsapp', label: 'Join the WhatsApp group', url: wa }]
  }

  const configured = configuredProviders()
  let enabled: string[] | null = null
  try { enabled = s['auth.providers'] ? JSON.parse(s['auth.providers']) : null } catch {}
  const providers = enabled ? configured.filter(p => enabled!.includes(p)) : configured

  return NextResponse.json({
    user: viewer.user,
    isAdmin: viewer.isAdmin,
    permissions: viewer.permissions,
    personId: viewer.personId,
    mode: deploymentMode(),
    features,
    access: {
      people: canView('people', viewer, settings),
      contributions: canView('contributions', viewer, settings) && features.contributions,
      relationTree: canView('relationTree', viewer, settings) && features.relationTree,
      program: canView('program', viewer, settings) && features.programPage,
    },
    gates: {
      condolencesRequireAuth: settings['access.condolencesRequireAuth'] === 'true',
      approvalMode: settings['moderation.approvalMode'] === 'on',
      tabs: {
        contributions: settings['tabs.contributions'] === 'on' && features.contributions,
        memories: settings['tabs.memories'] === 'on' && features.galleries,
        tribute: settings['tabs.tribute'] === 'on',
      },
      memoriesScope: settings['access.memoriesScope'],
      tributeAccess: settings['access.tribute'],
      tributeMaxLength: Number(settings['tribute.maxLength']) || 2000,
    },
    socialLinks,
    providers,
  })
}
