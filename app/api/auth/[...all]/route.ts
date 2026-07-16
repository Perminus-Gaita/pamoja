import { toNextJsHandler } from 'better-auth/next-js'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Ensure tables exist before better-auth touches them
async function handler(req: Request) {
  await db()
  const { GET, POST } = toNextJsHandler(auth())
  return req.method === 'GET' ? GET(req) : POST(req)
}

export { handler as GET, handler as POST }
