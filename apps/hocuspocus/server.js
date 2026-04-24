const { Server } = require('@hocuspocus/server')
const { Redis } = require('@hocuspocus/extension-redis')

const server = Server.configure({
  port: parseInt(process.env.PORT || '1234'),
  extensions: [
    new Redis({
      host: process.env.REDIS_URL
        ? new URL(process.env.REDIS_URL).hostname
        : 'redis',
      port: 6379,
    }),
  ],
  async onConnect(data) {
    console.log(`Client connected: ${data.requestParameters.get('documentName')}`)
  },
  async onDisconnect(data) {
    console.log(`Client disconnected`)
  },
})

server.listen()
console.log(`Hocuspocus running on port ${process.env.PORT || 1234}`)
