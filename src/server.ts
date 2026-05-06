import Fastify from 'fastify';
import { z } from 'zod';
import { runResearchLoop } from './core/loop';
import dotenv from 'dotenv';

dotenv.config();

const app = Fastify({ logger: true });

const ResearchRequestSchema = z.object({
  question: z.string().min(1),
  budgetUsd: z.number().optional(),
  maxSteps: z.number().int().optional(),
  noCritic: z.boolean().optional(),
});

app.post('/research', async (request, reply) => {
  const parsed = ResearchRequestSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: parsed.error.message });
  }

  const runId = `run-${Date.now()}`;
  
  runResearchLoop(parsed.data).catch(err => {
    app.log.error(err, `Run ${runId} failed`);
  });

  return reply.status(202).send({ runId, status: 'started' });
});

app.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = parseInt(process.env.PORT || '3000');
app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
  console.log(`[server] listening on port ${PORT}`);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
