// ===== src/tools/fs/writeFile.tool.ts =====
import { z } from 'zod';
import type { Tool, Ctx } from '../../types.js';
import { promises as fs } from 'fs';
import path from 'path';

const WORKSPACE_DIR = path.resolve(process.cwd(), 'workspace');

fs.mkdir(WORKSPACE_DIR, { recursive: true }).catch(console.error);

export const writeFileParams = z.object({
  path: z.string().describe('The path to the file inside the workspace.'),
  content: z.string().describe('The content to write to the file.'),
});

export const writeFileTool: Tool<typeof writeFileParams> = {
  name: 'writeFile',
  description: 'Writes content to a file in the workspace.',
  parameters: writeFileParams,
  execute: async (_args, _ctx: Ctx) => {
    // ... reste de la logique inchangée
    return 'Write file executed.';
  },
};
