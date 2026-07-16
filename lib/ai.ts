import Anthropic from '@anthropic-ai/sdk'
import { db, withRetry } from '@/lib/db'
import { CONFIG } from '@/lib/config'
import { hasPermission, type Viewer } from '@/lib/access'

/*
 * The single AI service boundary. Every AI action in the app (visitor Q&A,
 * admin agent, moderation triage, natural-language entry) goes through this
 * module — feature code never calls the LLM directly, so the execution layer
 * can later be swapped (e.g. to workflows) without touching callers.
 */

const MODEL = 'claude-opus-4-8'

export function aiAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

function client() {
  return new Anthropic()
}

async function siteSettings(): Promise<Record<string, string>> {
  const sql = await db()
  const rows = await withRetry(() => sql`SELECT key, value FROM settings WHERE key LIKE 'cfg.%' OR key = 'portrait'`)
  const s: Record<string, string> = {}
  for (const r of rows) s[r.key as string] = r.value as string
  return s
}

/* ── Visitor Q&A ──────────────────────────────────────────────────────────── */

export async function askMemorial(question: string): Promise<string> {
  const s = await siteSettings()
  const parse = (k: string) => { try { return s[k] ? JSON.parse(s[k]) : null } catch { return null } }

  const context = `
Memorial for: ${s['cfg.name'] ?? CONFIG.name}
Born: ${s['cfg.born'] ?? CONFIG.born} — Passed: ${s['cfg.passed'] ?? CONFIG.passed}
Epitaph: ${s['cfg.epitaph'] ?? CONFIG.epitaph}

Funeral / memorial program (events):
${JSON.stringify(parse('cfg.program') ?? [], null, 2)}

Programme note: ${s['cfg.programNote'] ?? ''}

Community links: ${JSON.stringify(parse('cfg.socialLinks') ?? [])}
`

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: `You are a gentle, respectful assistant on a memorial website (a digital condolence book). Visitors ask practical questions — where and when the funeral is, how to take part, how to reach the family. Answer briefly and warmly from the information below. If the answer is not in the information, say you don't have that detail and suggest contacting the family through the community links or checking back later. Never invent venues, dates, or contact details.\n\n${context}`,
    messages: [{ role: 'user', content: question.slice(0, 1000) }],
  })
  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { text: string }).text)
    .join('\n')
}

/* ── Moderation triage (paid rung of the moderation ladder) ──────────────── */

/**
 * Pre-screens a condolence. Returns 'approve' or 'hold' — NEVER a delete or
 * silent reject. Fail safe: any error or uncertainty means 'hold' when
 * approval-mode semantics demand review, and 'approve' is only returned for
 * clearly respectful messages.
 */
export async function triageCondolence(name: string, message: string): Promise<'approve' | 'hold'> {
  try {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 16,
      output_config: { effort: 'low' },
      system: `You screen condolence messages posted to a memorial page for a deceased person. Reply with exactly one word:
APPROVE — a respectful condolence, tribute, or sympathy message (any language).
HOLD — spam, advertising, harassment, mockery of the deceased, hateful content, or anything a grieving family should review before it appears publicly.
When unsure, reply HOLD. Never reply anything else.`,
      messages: [{ role: 'user', content: `Name: ${name.slice(0, 200)}\nMessage: ${message.slice(0, 2000)}` }],
    })
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { text: string }).text)
      .join('')
      .trim()
      .toUpperCase()
    return text.startsWith('APPROVE') ? 'approve' : 'hold'
  } catch {
    return 'hold' // fail safe: hold for human review, never drop
  }
}

/* ── Natural-language entry (paid) ────────────────────────────────────────── */

export type ParsedContribution = { name: string; relation: string; amount: number; note: string }

/** Parses free text like "Jane Doe, a cousin, gave 5,000 for the flowers". */
export async function parseContributionEntry(text: string): Promise<ParsedContribution | null> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 512,
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            found: { type: 'boolean' },
            name: { type: 'string' },
            relation: { type: 'string' },
            amount: { type: 'integer' },
            note: { type: 'string' },
          },
          required: ['found', 'name', 'relation', 'amount', 'note'],
          additionalProperties: false,
        },
      },
    },
    system: 'Extract a monetary contribution from the admin\'s free-text entry for a memorial site. found=false if no contributor name and amount are present. relation defaults to "Friend" when unstated; note holds any extra context; amount is the number only.',
    messages: [{ role: 'user', content: text.slice(0, 1000) }],
  })
  const raw = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { text: string }).text)
    .join('')
  try {
    const parsed = JSON.parse(raw)
    if (!parsed.found || !parsed.name || !parsed.amount) return null
    return { name: parsed.name, relation: parsed.relation || 'Friend', amount: parsed.amount, note: parsed.note ?? '' }
  } catch {
    return null
  }
}

/* ── Admin agent ──────────────────────────────────────────────────────────── */

const ADMIN_TOOLS: Anthropic.Tool[] = [
  {
    name: 'get_stats',
    description: 'Get site statistics: counts of people, condolences, contributions (with total amount), memories, tributes, groups, users, and pending memorial requests. Call this for any data-analysis question.',
    input_schema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_recent',
    description: 'List the most recent rows from a table for analysis. Returns up to 50 rows.',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: ['condolences', 'contributions', 'people', 'feedback', 'memorials', 'tributes'], description: 'Which data to list' },
      },
      required: ['table'],
      additionalProperties: false,
    },
  },
  {
    name: 'add_contribution',
    description: 'Record a monetary contribution from a named person.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Contributor full name' },
        relation: { type: 'string', description: 'Relationship to the deceased' },
        amount: { type: 'integer', description: 'Amount in the site currency' },
        note: { type: 'string', description: 'Optional note' },
      },
      required: ['name', 'relation', 'amount'],
      additionalProperties: false,
    },
  },
  {
    name: 'grant_access',
    description: 'Grant a signed-up user (by email) access to a gated area of the site.',
    input_schema: {
      type: 'object',
      properties: {
        email: { type: 'string', description: 'Email of an existing user account' },
        area: { type: 'string', enum: ['relation_tree', 'program', 'contributions'], description: 'Area to grant' },
      },
      required: ['email', 'area'],
      additionalProperties: false,
    },
  },
]

async function runAdminTool(name: string, input: Record<string, unknown>, viewer: Viewer): Promise<string> {
  const sql = await db()
  switch (name) {
    case 'get_stats': {
      const [stats] = await withRetry(() => sql`
        SELECT
          (SELECT COUNT(*) FROM people)::int        AS people,
          (SELECT COUNT(*) FROM condolences)::int   AS condolences,
          (SELECT COUNT(*) FROM contributions)::int AS contributions,
          (SELECT COALESCE(SUM(amount),0) FROM contributions)::int AS total_contributed,
          (SELECT COUNT(*) FROM memories)::int      AS memories,
          (SELECT COUNT(*) FROM tributes)::int      AS tributes,
          (SELECT COUNT(*) FROM groups)::int        AS groups,
          (SELECT COUNT(*) FROM "user")::int        AS users,
          (SELECT COUNT(*) FROM memorials WHERE status = 'pending')::int AS pending_memorials
      `)
      return JSON.stringify(stats)
    }
    case 'list_recent': {
      const table = String(input.table)
      const rows =
        table === 'condolences'   ? await sql`SELECT name, relation, message, moderation, hidden, created_at FROM condolences ORDER BY created_at DESC LIMIT 50`
        : table === 'contributions' ? await sql`SELECT name, relation, amount, note, created_at FROM contributions ORDER BY created_at DESC LIMIT 50`
        : table === 'people'        ? await sql`SELECT name, relation, family_group, created_at FROM people ORDER BY created_at DESC LIMIT 50`
        : table === 'feedback'      ? await sql`SELECT name, message, created_at FROM feedback ORDER BY created_at DESC LIMIT 50`
        : table === 'memorials'     ? await sql`SELECT slug, name, status, contact_name, created_at FROM memorials ORDER BY created_at DESC LIMIT 50`
        : table === 'tributes'      ? await sql`SELECT person_id, body, created_at FROM tributes ORDER BY created_at DESC LIMIT 50`
        : null
      if (!rows) return 'Unknown table'
      return JSON.stringify(rows)
    }
    case 'add_contribution': {
      if (!hasPermission(viewer, 'contributions')) return 'Error: you do not have the contributions permission.'
      const { name: n, relation, amount, note = '' } = input as { name: string; relation: string; amount: number; note?: string }
      if (!n || !relation || !amount) return 'Error: missing name, relation, or amount.'
      await sql`INSERT INTO contributions (name, relation, amount, note) VALUES (${n}, ${relation}, ${amount}, ${note})`
      return `Recorded ${amount} from ${n} (${relation}).`
    }
    case 'grant_access': {
      if (!hasPermission(viewer, 'access')) return 'Error: you do not have the access permission.'
      const { email, area } = input as { email: string; area: string }
      const [user] = await sql`SELECT "id" FROM "user" WHERE LOWER("email") = LOWER(${email})`
      if (!user) return `No user account found for ${email}. They need to sign up first.`
      await sql`
        INSERT INTO access_grants (user_id, area, granted_by)
        VALUES (${user.id}, ${area}, ${'ai:' + viewer.user!.email})
        ON CONFLICT (user_id, area) DO NOTHING
      `
      return `Granted ${email} access to ${area.replace('_', ' ')}.`
    }
    default:
      return `Unknown tool: ${name}`
  }
}

export async function runAdminAgent(
  messages: Array<{ role: string; content: string }>,
  viewer: Viewer,
): Promise<string> {
  let convo: Anthropic.MessageParam[] = messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content),
  }))

  let response: Anthropic.Message | null = null
  for (let i = 0; i < 6; i++) {
    response = await client().messages.create({
      model: MODEL,
      max_tokens: 2048,
      thinking: { type: 'adaptive' },
      system: `You are the administration assistant for a memorial website (digital condolence book). You help the site admin analyse condolences and contributions, record new contributions, and grant access to gated sections. Use the tools for anything data-related; never guess numbers. Be concise and practical. The admin you are talking to is ${viewer.user!.name} (${viewer.user!.email}).`,
      tools: ADMIN_TOOLS,
      messages: convo,
    })

    if (response.stop_reason !== 'tool_use') break

    const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
    convo = [...convo, { role: 'assistant', content: response.content }]
    const results: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      let out: string
      try {
        out = await runAdminTool(tu.name, tu.input as Record<string, unknown>, viewer)
      } catch (e) {
        out = `Tool failed: ${(e as Error).message}`
      }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: out })
    }
    convo = [...convo, { role: 'user', content: results }]
  }

  const text = (response?.content ?? [])
    .filter(b => b.type === 'text')
    .map(b => (b as { text: string }).text)
    .join('\n')
  return text || 'I could not produce an answer.'
}
