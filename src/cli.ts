import { Command } from 'commander';
import { runResearchLoop } from './core/loop';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

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
  .action(async (question: string, options: {
    budgetUsd: string;
    maxSteps: string;
    modelStrong: string;
    modelCheap: string;
    seed: string;
    critic: boolean;
    outDir: string;
  }) => {
    try {
      await runResearchLoop({
        question,
        budgetUsd: parseFloat(options.budgetUsd),
        maxSteps: parseInt(options.maxSteps),
        modelStrong: options.modelStrong,
        modelCheap: options.modelCheap,
        seed: parseInt(options.seed),
        noCritic: !options.critic,
        outDir: options.outDir,
      });
    } catch (error) {
      console.error('[error]', (error as Error).message);
      process.exit(1);
    }
  });

program.parse();
