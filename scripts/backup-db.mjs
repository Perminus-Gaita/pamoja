/**
 * Exports all Pamoja tables to a JSON file in backups/.
 * Run with: node scripts/backup-db.mjs
 */

import { neon } from '@neondatabase/serverless'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL not set')
  process.exit(1)
}

const sql = neon(url)

const [people, condolences, contributions, memories, settings, feedback] = await Promise.all([
  sql`SELECT * FROM public.people       ORDER BY id`,
  sql`SELECT * FROM public.condolences  ORDER BY id`,
  sql`SELECT * FROM public.contributions ORDER BY id`,
  sql`SELECT * FROM public.memories     ORDER BY id`,
  sql`SELECT * FROM public.settings     ORDER BY key`,
  sql`SELECT * FROM public.feedback     ORDER BY id`.catch(() => []),
])

const backup = {
  exported_at: new Date().toISOString(),
  tables: { people, condolences, contributions, memories, settings, feedback },
}

mkdirSync(join(ROOT, 'backups'), { recursive: true })

const filename = `pamoja-backup-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`
const outPath = join(ROOT, 'backups', filename)
writeFileSync(outPath, JSON.stringify(backup, null, 2))

console.log(`✓ Backup saved: backups/${filename}`)
console.log(`  people:        ${people.length} rows`)
console.log(`  condolences:   ${condolences.length} rows`)
console.log(`  contributions: ${contributions.length} rows`)
console.log(`  memories:      ${memories.length} rows`)
console.log(`  settings:      ${settings.length} rows`)
console.log(`  feedback:      ${feedback.length} rows`)
