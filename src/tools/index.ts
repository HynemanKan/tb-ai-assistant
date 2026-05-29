import type { ToolDefinition, ToolGroup } from "./types";
import { TOOL_GROUP_MAP } from "./types";
import getAvailableTags from "./get_available_tags";
import addTags from "./add_tags";

export { TOOL_GROUPS, TOOL_GROUP_MAP } from "./types";

const toolRegistry: Map<string, ToolDefinition> = new Map();

toolRegistry.set(getAvailableTags.name, getAvailableTags);
toolRegistry.set(addTags.name, addTags);

export function registerTool(tool: ToolDefinition): void {
  toolRegistry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

export function getToolsByGroup(group: ToolGroup): ToolDefinition[] {
  const toolNames = TOOL_GROUP_MAP[group] || [];
  return toolNames
    .map((name) => toolRegistry.get(name))
    .filter((t): t is ToolDefinition => t !== undefined);
}

export { getAvailableTags, addTags };
