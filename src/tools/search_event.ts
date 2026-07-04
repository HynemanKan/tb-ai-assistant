import type { ToolDefinition, ToolContext } from "./types";

function toIcalDatetime(iso: string): string {
  // Convert ISO 8601 to iCalendar format: YYYYMMDDTHHMMSSZ
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace(/\.\d{3}$/, "");
}

function parseJcalEvent(jcalItem: any): { title: string; start: string; end: string; location: string; description: string } {
  let title = "";
  let start = "";
  let end = "";
  let location = "";
  let description = "";

  if (!jcalItem || !Array.isArray(jcalItem)) {
    return { title, start, end, location, description };
  }

  // jcal格式: ["vcalendar", [], [["vevent", [...properties...]]]]
  const components = jcalItem[2];
  if (!components || !Array.isArray(components)) {
    return { title, start, end, location, description };
  }

  for (const component of components) {
    if (component[0] === "vevent" && Array.isArray(component[1])) {
      const properties = component[1];
      for (const prop of properties) {
        if (!Array.isArray(prop)) continue;
        
        const propName = prop[0];
        const propValue = prop[3]; // jcal格式中值在第4个位置

        switch (propName) {
          case "summary":
            title = propValue || "";
            break;
          case "dtstart":
            start = propValue || "";
            break;
          case "dtend":
            end = propValue || "";
            break;
          case "location":
            location = propValue || "";
            break;
          case "description":
            description = propValue || "";
            break;
        }
      }
    }
  }

  return { title, start, end, location, description };
}

const searchEvent: ToolDefinition = {
  name: "search_event",
  description:
    "Search calendar events by time range or keyword. Use start/end time for range queries, or keyword for fuzzy title matching.",
  parameters: {
    start: {
      type: "string",
      description: "Start time in ISO 8601 format (e.g. '2026-01-01T00:00:00')",
      required: false,
    },
    end: {
      type: "string",
      description: "End time in ISO 8601 format (e.g. '2026-01-31T23:59:59')",
      required: false,
    },
    keyword: {
      type: "string",
      description: "Keyword to fuzzy match against event title/summary",
      required: false,
    },
  },
  async execute(
    args: Record<string, any>,
    _ctx: ToolContext
  ): Promise<{ events: any[]; error?: string }> {
    try {
      const { start, end, keyword } = args;

      if (!start && !end && !keyword) {
        return { events: [], error: "At least one of start, end, or keyword is required" };
      }

      const queryOptions: any = {
        type: "event",
        expand: true,
        returnFormat: "jcal",
      };

      if (start) queryOptions.rangeStart = toIcalDatetime(start);
      if (end) queryOptions.rangeEnd = toIcalDatetime(end);

      const items = await (messenger as any).calendar.items.query(queryOptions);

      let results = Array.isArray(items) ? items : [];

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        results = results.filter((item: any) => {
          const parsed = parseJcalEvent(item.item);
          return parsed.title.toLowerCase().includes(lowerKeyword);
        });
      }

      return {
        events: results.map((item: any) => {
          const parsed = parseJcalEvent(item.item);
          return {
            id: item.id,
            calendarId: item.calendarId,
            title: parsed.title || "(No title)",
            start: parsed.start,
            end: parsed.end,
            location: parsed.location,
            description: parsed.description,
          };
        }),
      };
    } catch (error) {
      console.error("Failed to search events:", error);
      return {
        events: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export default searchEvent;
