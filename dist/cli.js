"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const loop_1 = require("./core/loop");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const program = new commander_1.Command();
program
    .name('research-agent')
    .description('Autonomous research agent with Plan-Execute-Observe-Reflect loop')
    .version('1.0.0')
    .argument('<question>', 'Research question to answer')
    .option('--budget-usd <amount>', 'Maximum cost budget in USD', '1.00')
    .option('--max-steps <n>', 'Maximum tool calls', '50')
    .option('--model-strong <model>', 'Strong LLM model', process.env.STRONG_MODEL || 'gpt-4o')
    .option('--model-cheap <model>', 'Cheap LLM model', process.env.CHEAP_MODEL || 'gpt-4o-mini')
    .option('--seed <n>', 'Random seed for reproducibility', '42')
    .option('--no-critic', 'Skip critic evaluation')
    .option('--out-dir <dir>', 'Output directory', './out')
    .action(async (question, options) => {
    try {
        await (0, loop_1.runResearchLoop)({
            question,
            budgetUsd: parseFloat(options.budgetUsd),
            maxSteps: parseInt(options.maxSteps),
            modelStrong: options.modelStrong,
            modelCheap: options.modelCheap,
            seed: parseInt(options.seed),
            noCritic: !options.critic,
            outDir: options.outDir,
        });
    }
    catch (error) {
        console.error('[error]', error.message);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli.js.map