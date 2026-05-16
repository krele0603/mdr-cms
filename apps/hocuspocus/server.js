const { Server } = require('@hocuspocus/server')
const { jwtVerify } = require('jose')

const SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)

if (!process.env.NEXTAUTH_SECRET) {
  console.error('[hocuspocus] FATAL: NEXTAUTH_SECRET is not set.')
  process.exit(1)
}

async function verifySession(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] })
    return payload
  } catch (e) {
    return null
  }
}

const server = Server.configure({
  port: parseInt(process.env.PORT || '1234'),
  // Redis extension omitted — single instance in-memory is fine for a Pi dev server.
  // Add it back with proper auth when deploying to production multi-instance infra.
  async onAuthenticate(data) {
    const token = data.requestParameters.get('token')
    if (!token) {
      console.warn('[hocuspocus] Rejected: no token')
      throw new Error('Unauthorized')
    }
    const user = await verifySession(token)
    if (!user) {
      console.warn('[hocuspocus] Rejected: invalid token')
      throw new Error('Unauthorized')
    }
    return { user }
  },
  async onConnect(data) {
    const userId = data.context?.user?.id ?? 'unknown'
    const doc = data.requestParameters.get('documentName') ?? 'unknown'
    console.log('[hocuspocus] Connected: user=' + userId + ' doc=' + doc)
  },
  async onDisconnect(data) {
    console.log('[hocuspocus] Disconnected')
  },
})

server.listen()
console.log('[hocuspocus] Running on port ' + (process.env.PORT || 1234))
