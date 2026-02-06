import { FastifyPluginCallback } from 'fastify'
import type { FastifyServer } from './types.ts'
import { ZodTypeProvider } from 'fastify-type-provider-zod'

export function createFastifyPlugin(cb: FastifyPluginCallback) {
  return function createFastifyPluginWrapper(
    fastify: FastifyServer,
    options: Parameters<FastifyPluginCallback>[1],
    done: Parameters<FastifyPluginCallback>[2],
  ) {
    const server = fastify.withTypeProvider<ZodTypeProvider>()
    let doneCalled = false

    const doneWrapper = (err?: Error) => {
      done(err)
      doneCalled = true
    }

    cb(server, options, doneWrapper)

    if (!doneCalled) {
      done()
    }
  }
}
