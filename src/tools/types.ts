export interface ToolContext {
  messageHeader?: MessageHeader;
  config?: any;
  [key: string]: any;
}

export interface MessageHeader {
  id: number;
  date: Date;
  author: string;
  recipients: string[];
  subject: string;
}

export interface ToolParameter {
  type: string;
  description: string;
  enum?: string[];
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  execute: (args: Record<string, any>, ctx: ToolContext) => Promise<any>;
}

export type ToolGroup = "MAIL_TAG"|"CALENDAR_EVENT"|"CALENDAR_TASK";

export const TOOL_GROUPS: ToolGroup[] = ["MAIL_TAG","CALENDAR_EVENT","CALENDAR_TASK"];

export const TOOL_GROUP_MAP: Record<ToolGroup, string[]> = {
  MAIL_TAG: ["get_available_tags", "add_tags"],
  CALENDAR_EVENT: ["search_event", "add_event"],
  CALENDAR_TASK:["search_task", "add_task"],
};
