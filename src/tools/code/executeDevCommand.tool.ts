// src/tools/code/executeDevCommand.tool.ts
import { z } from 'zod';
import type { Tool, Ctx } from '../../types.js';
import { runInSandbox } from '../../utils/dockerManager.js';
import { getErrDetails } from '../../utils/errorUtils.js';

const DEV_SANDBOX_IMAGE = 'node:20-alpine';

export const executeDevCommandParams = z.object({
  command: z
    .string()
    .describe(
      'The shell command to execute (e.g., "pnpm install", "tsc --noEmit")',
    ),
});

export const executeDevCommandTool: Tool<typeof executeDevCommandParams> = {
  name: 'executeDevCommand',
  description:
    'Executes shell commands within a secure sandbox that includes Node.js and pnpm.',
  parameters: executeDevCommandParams,
  execute: async (args, ctx: Ctx) => {
    ctx.log.info(`Executing dev command in sandbox: "${args.command}"`);
    try {
      const commandParts = args.command.split(' ');
      const result = await runInSandbox(DEV_SANDBOX_IMAGE, commandParts, {
        workingDir: '/usr/src/app',
        mounts: [
          {
            Type: 'bind',
            Source: process.cwd(),
            Target: '/usr/src/app',
          },
        ],
      });

      let output = `Exit Code: ${result.exitCode}\n`;
      if (result.stdout) output += `--- STDOUT ---\n${result.stdout}\n`;
      if (result.stderr) output += `--- STDERR ---\n${result.stderr}\n`;
      return output;
    } catch (error) {
      // CORRECTION DÉFINITIVE : Séparation du message et de l'objet de données.
      const errDetails = getErrDetails(error);
      ctx.log.error('Dev command sandbox execution failed', {
        name: errDetails.name,
        message: errDetails.message,
        stack: errDetails.stack,
      });
      return `Error: Failed to execute dev command. ${errDetails.message}`;
    }
  },
};
