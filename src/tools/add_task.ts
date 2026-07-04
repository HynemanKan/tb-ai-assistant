import type { ToolDefinition, ToolContext } from "./types";
import { CALENDAR_TASK_ID } from "@/utils/Config";

function toIcalDatetime(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace(/\.\d{3}$/, "");
}

function buildIcalTask(props: {
  title: string;
  due: string;
  priority?: number;
  description?: string;
  url?: string;
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TB AI Assistant//EN",
    "BEGIN:VTODO",
    "SUMMARY:" + props.title,
    "DUE:" + toIcalDatetime(props.due),
  ];
  if (props.priority !== undefined && props.priority > 0) {
    lines.push("PRIORITY:" + props.priority);
  }
  if (props.description) lines.push("DESCRIPTION:" + props.description);
  if (props.url) lines.push("URL:" + props.url);
  lines.push("END:VTODO");
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

const addTask: ToolDefinition = {
  name: "add_task",
  description: "Add a new calendar task to the configured calendar. Tasks only have a due date, no start time.",
  parameters: {
    title: {
      type: "string",
      description: "Task title/summary",
      required: true,
    },
    due: {
      type: "string",
      description: "Task due date in ISO 8601 format (e.g. '2026-06-15T18:00:00')",
      required: true,
    },
    priority: {
      type: "number",
      description: "Task priority (0 = undefined, 1 = highest, 9 = lowest)",
      required: false,
    },
    description: {
      type: "string",
      description: "Task description/notes",
      required: false,
    },
    linkToEmail: {
      type: "boolean",
      description: "Whether to link this task to the current email as a mid: URL",
      required: false,
    },
  },
  async execute(
    args: Record<string, any>,
    ctx: ToolContext
  ): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
      const { title, due, priority, description, linkToEmail } = args;

      if (!title) return { success: false, error: "title is required" };
      if (!due) return { success: false, error: "due is required" };

      let calendarId: string;
      try {
        calendarId = args.calendarId || ctx.config?.[CALENDAR_TASK_ID] || "";
        if (!calendarId) {
          const list = await (messenger as any).calendar.calendars.query({ enabled: true });
          if (!list || list.length === 0) {
            return { success: false, error: "No enabled calendar found" };
          }
          // Try to find a calendar that supports tasks (not main calendar)
          // Main calendar typically doesn't support VTODO
          const taskCalendar = list.find((cal: any) => 
            cal.name !== "main" && !cal.name.toLowerCase().includes("main")
          );
          calendarId = taskCalendar ? taskCalendar.id : list[0].id;
        }
      } catch (e) {
        console.error("Failed to retrieve calendars:", e);
        return { success: false, error: "Failed to retrieve calendars: " + (e instanceof Error ? e.message : String(e)) };
      }

      let url: string | undefined;
      if (linkToEmail && ctx.messageHeader?.id) {
        const full = await messenger.messages.getFull(ctx.messageHeader.id);
        const messageId = full?.headers?.["message-id"]?.[0];
        if (messageId) {
          // Remove angle brackets from message-id if present
          const cleanMessageId = messageId.replace(/^</, "").replace(/>$/, "");
          url = `mid:${cleanMessageId}`;
        }
      }

      const icalItem = buildIcalTask({ title, due, priority, description, url });

      const created = await (messenger as any).calendar.items.create(calendarId, {
        type: "task",
        format: "ical",
        item: icalItem,
      });

      return { success: true, taskId: created.id };
    } catch (error) {
      console.error("Failed to add task:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export default addTask;
