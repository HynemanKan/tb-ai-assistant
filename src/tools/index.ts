import type { ToolDefinition, ToolGroup, ToolContext } from "./types";
import { TOOL_GROUP_MAP } from "./types";
import getAvailableTags from "./get_available_tags";
import addTags from "./add_tags";
import searchEvent from "./search_event";
import addEvent from "./add_event";
import searchTask from "./search_task";
import addTask from "./add_task";

export type { ToolDefinition, ToolGroup, ToolContext };
export { TOOL_GROUPS, TOOL_GROUP_MAP } from "./types";

const toolRegistry: Map<string, ToolDefinition> = new Map();

toolRegistry.set(getAvailableTags.name, getAvailableTags);
toolRegistry.set(addTags.name, addTags);
toolRegistry.set(searchEvent.name, searchEvent);
toolRegistry.set(addEvent.name, addEvent);
toolRegistry.set(searchTask.name, searchTask);
toolRegistry.set(addTask.name, addTask);

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

export { getAvailableTags, addTags, searchEvent, addEvent, searchTask, addTask };
