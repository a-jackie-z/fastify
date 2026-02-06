import { createFastifyPlugin } from '../plugin.ts'
import type { FastifyServer } from '../types.ts'

export const healthPlugin = createFastifyPlugin((app: FastifyServer) => {
  app.get('/v1/health', {
    schema: {
      tags: ['health'],
    },
    config: {
      jwt: false,
    },
    handler: async () => {
      return {
        status: 200,
        message: 'ok',
      }
    },
  })
})
