// src/tools/system/restartServer.tool.ts
import { z } from 'zod';
import type { Tool, Ctx } from '../../types.js';
import { exec, type ExecException } from 'child_process';
import { getErrDetails } from '../../utils/errorUtils.js';

export const restartServerParams = z.object({
  reason: z
    .string()
    .optional()
    .describe('The reason for the restart (e.g., loading a new tool).'),
});

export const restartServerTool: Tool<typeof restartServerParams> = {
  name: 'system_restartServer',
  description:
    'Restarts the agent server and workers to apply changes, such as loading a new tool.',
  parameters: restartServerParams,
  execute: async (args, ctx: Ctx) => {
    ctx.log.warn('AGENT IS INITIATING A SERVER RESTART.', {
      reason: args.reason,
    });
    const command = 'docker-compose restart server worker';
    exec(
      command,
      (error: ExecException | null, stdout: string, stderr: string) => {
        if (error) {
          // CORRECTION APPLIQUÉE
          ctx.log.error('Failed to execute restart command.', {
            error: getErrDetails(error),
            stdout,
            stderr,
          });
        }
      },
    );
    return `Restart command issued for reason: ${args.reason || 'No reason specified'}. The server will be unavailable for a moment.`;
  },
};
