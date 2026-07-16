import { getPrimaryMemorial } from '@/lib/site'

/*
 * Entitlement gating — the single free/paid switch.
 *
 * Two deployment modes, chosen by NEXT_PUBLIC_DEPLOYMENT_MODE:
 *   'selfhost' (default) — every feature enabled, always. The check is a no-op.
 *   'managed'            — paid enhancements are gated by the memorial's plan.
 *
 * Hard rules baked in here and everywhere else:
 *   - Condolences are unlimited, free, and never behind a wall, in every mode.
 *   - The primary photo of the deceased is never paywalled.
 *   - Manual moderation (approve/hide, block anonymous) is always free.
 */

export type Feature =
  | 'relationTree'   // relation / relationship tree
  | 'aiEntry'        // AI natural-language entry (parse "name + amount" text)
  | 'galleries'      // photo memories / galleries beyond the primary photo
  | 'contributions'  // contributions page
  | 'programPage'    // custom program / order-of-service page
  | 'aiModeration'   // AI moderation triage

const PAID_FEATURES: readonly Feature[] = [
  'relationTree', 'aiEntry', 'galleries', 'contributions', 'programPage', 'aiModeration',
]

export function deploymentMode(): 'selfhost' | 'managed' {
  return process.env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'managed' ? 'managed' : 'selfhost'
}

/** True when the feature is available on this deployment/plan. */
export async function hasFeature(feature: Feature): Promise<boolean> {
  if (deploymentMode() === 'selfhost') return true
  if (!PAID_FEATURES.includes(feature)) return true
  const memorial = await getPrimaryMemorial()
  return memorial?.plan === 'paid'
}

/** All feature flags at once — for /api/me so the client renders the right UI. */
export async function allFeatures(): Promise<Record<Feature, boolean>> {
  if (deploymentMode() === 'selfhost') {
    return { relationTree: true, aiEntry: true, galleries: true, contributions: true, programPage: true, aiModeration: true }
  }
  const memorial = await getPrimaryMemorial()
  const paid = memorial?.plan === 'paid'
  return { relationTree: paid, aiEntry: paid, galleries: paid, contributions: paid, programPage: paid, aiModeration: paid }
}
