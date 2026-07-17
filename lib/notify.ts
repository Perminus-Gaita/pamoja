// Operator notifications via Telegram — used when a visitor leaves contact
// details (contact form, memorial requests). Optional: silently does nothing
// unless TELEGRAM_BOT_TOKEN and ADMINS_TELEGRAM_IDS are set.
//
//   TELEGRAM_BOT_TOKEN   — bot token from @BotFather
//   ADMINS_TELEGRAM_IDS  — comma-separated Telegram chat ids to notify

export async function notifyAdmins(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const ids = (process.env.ADMINS_TELEGRAM_IDS ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (!token || ids.length === 0) return

  await Promise.allSettled(
    ids.map(async chat_id => {
      try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id, text }),
        })
        if (!res.ok) {
          const detail = await res.text().catch(() => '')
          console.warn(`telegram notify failed for chat ${chat_id}: ${res.status} ${detail}`)
        }
      } catch (e) {
        console.warn(`telegram notify failed for chat ${chat_id}:`, e)
      }
    })
  )
}
