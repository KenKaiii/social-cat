import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getAgentWorkspaceDir } from '@/lib/agent-workspace';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SlashCommand {
  name: string;
  description: string;
  argumentHint: string;
}

const BUILT_IN_COMMANDS: SlashCommand[] = [
  {
    name: 'clear',
    description: 'Clear conversation history and start fresh',
    argumentHint: '',
  },
  {
    name: 'compact',
    description: 'Compact conversation history to reduce token usage',
    argumentHint: '',
  },
];

function parseFrontmatter(content: string): { description: string; argumentHint: string } {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    return { description: '', argumentHint: '' };
  }

  const frontmatter = frontmatterMatch[1];
  const descMatch = frontmatter.match(/description:\s*(.+)/);
  const argMatch = frontmatter.match(/argument-hint:\s*(.+)/);

  return {
    description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : '',
    argumentHint: argMatch ? argMatch[1].trim().replace(/^["']|["']$/g, '') : '',
  };
}

export async function GET() {
  try {
    const workspaceDir = getAgentWorkspaceDir();
    const commandsDir = join(workspaceDir, '.claude', 'commands');

    const commands: SlashCommand[] = [...BUILT_IN_COMMANDS];

    // Load custom commands from .claude/commands
    if (existsSync(commandsDir)) {
      const files = readdirSync(commandsDir);

      for (const file of files) {
        if (file.endsWith('.md')) {
          const filePath = join(commandsDir, file);
          const content = readFileSync(filePath, 'utf-8');
          const { description, argumentHint } = parseFrontmatter(content);

          commands.push({
            name: file.replace('.md', ''),
            description,
            argumentHint,
          });
        }
      }
    }

    return Response.json({ commands });
  } catch (error) {
    logger.error({ error }, 'Error loading commands');
    return Response.json({ commands: BUILT_IN_COMMANDS });
  }
}
