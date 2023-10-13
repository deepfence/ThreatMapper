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

app.route({
  method: 'post',
  url: '/start-agent',
  schema: {
    body: Type.Object({
      tag: Type.String(),
      consoleIp: Type.String(),
      apiKey: Type.String(),
    }),
    response: {
      200: {
        ok: Type.Boolean(),
      },
    },
  },
  handler: async (req, res) => {
    const { tag, apiKey, consoleIp } = req.body;

    try {
      const resp =
        await $`docker run -dit --cpus=".2" --name=deepfence-agent --restart on-failure --pid=host --net=host --log-driver json-file --log-opt max-size=50m --privileged=true -v /sys/kernel/debug:/sys/kernel/debug:rw -v /var/log/fenced -v /var/run/docker.sock:/var/run/docker.sock -v /:/fenced/mnt/host/:ro -e USER_DEFINED_TAGS="" -e MGMT_CONSOLE_URL="${consoleIp}" -e MGMT_CONSOLE_PORT="443" -e DEEPFENCE_KEY="${apiKey}" deepfenceio/deepfence_agent_ce:${tag}`;
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
  url: '/stop-agent',
  schema: {
    response: {
      200: {
        ok: Type.Boolean(),
      },
    },
  },
  handler: async (req, res) => {
    try {
      const resp =
        await $`docker stop deepfence-agent && docker container prune --force && docker network prune --force && docker volume prune --filter all=1 --force`;
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
