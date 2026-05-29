import type { ToolDefinition, ToolContext } from "./types";

const addTags: ToolDefinition = {
  name: "add_tags",
  description: "Add tags to an email. The tags will be merged with existing tags on the email. Use get_available_tags first to see available tags.",
  parameters: {
    tags: {
      type: "array",
      description: "Array of tag keys to add to the email (e.g., ['$label3', '$label4'])",
      required: true,
    },
  },
  async execute(args: Record<string, any>, ctx: ToolContext): Promise<{ success: boolean; error?: string }> {
    try {
      const messageId = ctx.messageHeader?.id;
      if (!messageId) {
        throw new Error("No message ID provided in context");
      }

      const tagsToAdd: string[] = args.tags;
      if (!Array.isArray(tagsToAdd) || tagsToAdd.length === 0) {
        throw new Error("No tags provided to add");
      }

      const message = await messenger.messages.get(messageId);
      const existingTags: string[] = message.tags || [];

      const mergedTags = [...new Set([...existingTags, ...tagsToAdd])];

      await messenger.messages.update(messageId, { tags: mergedTags });

      return { success: true };
    } catch (error) {
      console.error("Failed to add tags:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export default addTags;
