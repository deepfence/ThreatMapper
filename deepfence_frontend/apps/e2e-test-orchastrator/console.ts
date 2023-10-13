import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import Fastify from 'fastify';
import { Type } from '@sinclair/typebox';
import { $ } from 'zx';
import fs from 'fs/promises';

const app = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

app.get('/ping', async () => {
  return { ping: 'pong' };
});

type ConsoleStatus = 'running' | 'stopped' | 'starting' | 'stopping';
const dockerComposePath = await fs.realpath(
  '../../../deployment-scripts/docker-compose.yml',
);

app.route({
  method: 'post',
  url: '/start-console',
  schema: {
    body: Type.Object({
      tag: Type.String(),
    }),
    response: {
      200: {
        ok: Type.Boolean(),
      },
    },
  },
  handler: async (req, res) => {
    const { tag } = req.body;

    try {
      const resp =
        await $`DF_IMG_TAG="${tag}" docker compose -f ${dockerComposePath} up --detach`;
      app.log.debug(resp);
    } catch (e) {
      console.error(e);
      return {
        ok: false,
      };
    }

    return {
      ok: true,
    };
  },
});

app.route({
  method: 'post',
  url: '/stop-console',
  schema: {
    response: {
      200: {
        ok: Type.Boolean(),
      },
    },
  },
  handler: async (req, res) => {
    try {
      const resp = await $`docker compose -f ${dockerComposePath} down`;
      app.log.debug(resp);
    } catch (e) {
      console.error(e);
      return {
        ok: false,
      };
    }

    try {
      const resp =
        await $`docker container prune --force && docker network prune --force && docker volume prune --filter all=1 --force`;
      app.log.debug(resp);
    } catch (e) {
      console.error(e);
      return {
        ok: false,
      };
    }

    return {
      ok: true,
    };
  },
});

try {
  await app.listen({ port: 3000, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
