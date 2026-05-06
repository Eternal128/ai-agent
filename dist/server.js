"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const zod_1 = require("zod");
const loop_1 = require("./core/loop");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, fastify_1.default)({ logger: true });
const ResearchRequestSchema = zod_1.z.object({
    question: zod_1.z.string().min(1),
    budgetUsd: zod_1.z.number().optional(),
    maxSteps: zod_1.z.number().int().optional(),
    noCritic: zod_1.z.boolean().optional(),
});
app.post('/research', async (request, reply) => {
    const parsed = ResearchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.message });
    }
    const runId = `run-${Date.now()}`;
    (0, loop_1.runResearchLoop)(parsed.data).catch(err => {
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
//# sourceMappingURL=server.js.map