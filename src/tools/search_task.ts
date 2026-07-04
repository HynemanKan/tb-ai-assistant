import type { ToolDefinition, ToolContext } from "./types";

function toIcalDatetime(iso: string): string {
  // Convert ISO 8601 to iCalendar format: YYYYMMDDTHHMMSSZ
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z").replace(/\.\d{3}$/, "");
}

function parseJcalTask(jcalItem: any): { title: string; due: string; priority: number; completed: boolean; description: string } {
  let title = "";
  let due = "";
  let priority = 0;
  let completed = false;
  let description = "";

  if (!jcalItem || !Array.isArray(jcalItem)) {
    return { title, due, priority, completed, description };
  }

  // jcal格式: ["vcalendar", [], [["vtodo", [...properties...]]]]
  const components = jcalItem[2];
  if (!components || !Array.isArray(components)) {
    return { title, due, priority, completed, description };
  }

  for (const component of components) {
    if (component[0] === "vtodo" && Array.isArray(component[1])) {
      const properties = component[1];
      for (const prop of properties) {
        if (!Array.isArray(prop)) continue;
        
        const propName = prop[0];
        const propValue = prop[3]; // jcal格式中值在第4个位置

        switch (propName) {
          case "summary":
            title = propValue || "";
            break;
          case "due":
            due = propValue || "";
            break;
          case "priority":
            priority = parseInt(propValue) || 0;
            break;
          case "completed":
            completed = propValue === "TRUE";
            break;
          case "description":
            description = propValue || "";
            break;
        }
      }
    }
  }

  return { title, due, priority, completed, description };
}

const searchTask: ToolDefinition = {
  name: "search_task",
  description:
    "Search calendar tasks by due date (end time) or keyword. Tasks do not have a start time.",
  parameters: {
    end: {
      type: "string",
      description: "Due date / end time in ISO 8601 format (e.g. '2026-01-31T23:59:59')",
      required: false,
    },
    keyword: {
      type: "string",
      description: "Keyword to fuzzy match against task title/summary",
      required: false,
    },
  },
  async execute(
    args: Record<string, any>,
    _ctx: ToolContext
  ): Promise<{ tasks: any[]; error?: string }> {
    try {
      const { end, keyword } = args;

      if (!end && !keyword) {
        return { tasks: [], error: "At least one of end or keyword is required" };
      }

      const queryOptions: any = {
        type: "task",
        returnFormat: "jcal",
      };

      if (end) queryOptions.rangeEnd = toIcalDatetime(end);

      const items = await (messenger as any).calendar.items.query(queryOptions);

      let results = Array.isArray(items) ? items : [];

      if (keyword) {
        const lowerKeyword = keyword.toLowerCase();
        results = results.filter((item: any) => {
          const parsed = parseJcalTask(item.item);
          return parsed.title.toLowerCase().includes(lowerKeyword);
        });
      }

      return {
        tasks: results.map((item: any) => {
          const parsed = parseJcalTask(item.item);
          return {
            id: item.id,
            calendarId: item.calendarId,
            title: parsed.title || "(No title)",
            due: parsed.due,
            priority: parsed.priority,
            completed: parsed.completed,
            description: parsed.description,
          };
        }),
      };
    } catch (error) {
      console.error("Failed to search tasks:", error);
      return {
        tasks: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export default searchTask;
