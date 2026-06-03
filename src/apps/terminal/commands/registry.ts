/**
 * Command registry — single source of truth for available commands.
 *
 * Modules register their commands via `registerAll(commands)`. The registry
 * provides lookup by name (including aliases) and Tab-completion candidates.
 */

import type { Command } from "./types";
import { systemCommands } from "./system";
import { portfolioCommands } from "./portfolio";
import { eggCommands } from "./eggs";

const commandMap = new Map<string, Command>();
const allCommands: Command[] = [];

function register(command: Command): void {
  const key = command.name.toLowerCase();
  commandMap.set(key, command);
  if (command.aliases) {
    for (const alias of command.aliases) {
      commandMap.set(alias.toLowerCase(), command);
    }
  }
  // De-duplicate by name in allCommands so help / commandsByCategory don't show
  // the same command twice when both system and portfolio define it (e.g. whoami).
  // Later registration wins (portfolio overrides system).
  const existing = allCommands.findIndex(c => c.name.toLowerCase() === key);
  if (existing >= 0) {
    allCommands[existing] = command;
  } else {
    allCommands.push(command);
  }
}

// Register at module load
for (const cmd of [...systemCommands, ...portfolioCommands, ...eggCommands]) {
  register(cmd);
}

export function findCommand(name: string): Command | undefined {
  return commandMap.get(name.toLowerCase());
}

export function listCommands(opts?: { includeHidden?: boolean }): Command[] {
  if (opts?.includeHidden) return [...allCommands];
  return allCommands.filter(c => !c.hidden);
}

export function commandsByCategory(): Record<string, Command[]> {
  const groups: Record<string, Command[]> = { portfolio: [], system: [], navigation: [], egg: [], other: [] };
  for (const cmd of allCommands) {
    if (cmd.hidden) continue;
    const cat = cmd.category ?? "other";
    (groups[cat] ?? groups.other).push(cmd);
  }
  return groups;
}

/** Tab-completion candidates for a command name prefix. */
export function completeCommandName(prefix: string): string[] {
  const p = prefix.toLowerCase();
  const seen = new Set<string>();
  const matches: string[] = [];
  for (const [key, cmd] of commandMap.entries()) {
    if (cmd.hidden) continue;
    if (key.startsWith(p) && !seen.has(cmd.name)) {
      seen.add(cmd.name);
      matches.push(cmd.name);
    }
  }
  return matches.sort();
}
