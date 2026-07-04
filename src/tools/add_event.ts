import type { ToolDefinition, ToolContext } from "./types";
import { CALENDAR_EVENT_ID } from "@/utils/Config";

function toIcalDatetime(iso: string): string {
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace(/\.\d{3}$/, "");
}

function buildIcalEvent(props: {
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  url?: string;
}): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TB AI Assistant//EN",
    "BEGIN:VEVENT",
    "SUMMARY:" + props.title,
    "DTSTART:" + toIcalDatetime(props.start),
    "DTEND:" + toIcalDatetime(props.end),
  ];
  if (props.location) lines.push("LOCATION:" + props.location);
  if (props.description) lines.push("DESCRIPTION:" + props.description);
  if (props.url) lines.push("URL:" + props.url);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

const addEvent: ToolDefinition = {
  name: "add_event",
  description: "Add a new calendar event to the configured calendar.",
  parameters: {
    title: {
      type: "string",
      description: "Event title/summary",
      required: true,
    },
    start: {
      type: "string",
      description: "Event start time in ISO 8601 format (e.g. '2026-06-01T10:00:00')",
      required: true,
    },
    end: {
      type: "string",
      description: "Event end time in ISO 8601 format (e.g. '2026-06-01T11:00:00')",
      required: true,
    },
    location: {
      type: "string",
      description: "Event location",
      required: false,
    },
    description: {
      type: "string",
      description: "Event description/body",
      required: false,
    },
    linkToEmail: {
      type: "boolean",
      description: "Whether to link this event to the current email as a mid: URL",
      required: false,
    },
  },
  async execute(
    args: Record<string, any>,
    ctx: ToolContext
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      const { title, start, end, location, description, linkToEmail } = args;

      if (!title) return { success: false, error: "title is required" };
      if (!start) return { success: false, error: "start is required" };
      if (!end) return { success: false, error: "end is required" };

      let calendarId: string;
      try {
        calendarId = args.calendarId || ctx.config?.[CALENDAR_EVENT_ID] || "";
        if (!calendarId) {
          const list = await (messenger as any).calendar.calendars.query({ enabled: true });
          if (!list || list.length === 0) {
            return { success: false, error: "No enabled calendar found" };
          }
          calendarId = list[0].id;
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

      const icalItem = buildIcalEvent({ title, start, end, location, description, url });

      const created = await (messenger as any).calendar.items.create(calendarId, {
        type: "event",
        format: "ical",
        item: icalItem,
      });

      return { success: true, eventId: created.id };
    } catch (error) {
      console.error("Failed to add event:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export default addEvent;
