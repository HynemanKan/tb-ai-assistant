import type { ToolDefinition, ToolContext } from "./types";

const getAvailableTags: ToolDefinition = {
  name: "get_available_tags",
  description: "Get all available mail tags with their descriptions. Use this to retrieve the list of tags that can be applied to emails.",
  parameters: {},
  async execute(args: Record<string, any>, ctx: ToolContext): Promise<any> {
    try {
      const tags = await messenger.messages.listTags();
      const config = ctx.config;
      const tagDescriptions = config?.TAG_DESCRIPTIONS || {};

      const result = tags
        .filter((tag: any) => {
          const tagConfig = tagDescriptions[tag.key];
          return !tagConfig?.disabled;
        })
        .map((tag: any) => {
          const tagConfig = tagDescriptions[tag.key];
          return {
            key: tag.key,
            name: tag.tag,
            color: tag.color,
            description: tagConfig?.description || "",
          };
        });

      return result;
    } catch (error) {
      console.error("Failed to get available tags:", error);
      return [];
    }
  },
};

export default getAvailableTags;
