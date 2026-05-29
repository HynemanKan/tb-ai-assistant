import type { Config } from "@/utils/ConfigManager";
import { SYSTEM_PROMPT, LLM_TYPE, LLM_MODEL, LLM_API_ENDPOINT, TOOL_ENABLE } from "@/utils/Config";
import { callLLM, type ChatMessage } from "./llm";
import { getTool, TOOL_GROUP_MAP, type ToolContext, type ToolDefinition } from "@/tools";
import { saveChatRecord } from "@/utils/ChatHistory";

export { testLLMConfig } from "./llm";
export type { ChatMessage, LLMResponse } from "./llm";

export interface EmailInfo {
  id: number;
  subject: string;
  author: string;
  recipients: string[];
  date: Date;
  body?: string;
}

const MAX_ITERATIONS = 10;

function buildToolDefinitions(config: Config): string {
  const enabledGroups = config[TOOL_ENABLE];
  const tools: ToolDefinition[] = [];

  for (const group of enabledGroups) {
    const toolNames = TOOL_GROUP_MAP[group] || [];
    for (const name of toolNames) {
      const tool = getTool(name);
      if (tool) {
        tools.push(tool);
      }
    }
  }

  if (tools.length === 0) {
    return "";
  }

  const toolDescriptions = tools.map((tool) => {
    const params = Object.entries(tool.parameters)
      .map(([name, param]) => `  - ${name} (${param.type}${param.required ? ", required" : ""}): ${param.description}`)
      .join("\n");

    return `## ${tool.name}\n${tool.description}\nParameters:\n${params}`;
  }).join("\n\n");

  return `\n\nYou have access to the following tools:\n\n${toolDescriptions}\n\nTo use a tool, respond with a JSON object in this format:\n{"tool": "tool_name", "args": {...}}\n\nWhen you are done with all tasks, respond with "END" on a new line.`;
}

function buildEmailContent(email: EmailInfo): string {
  return `Subject: ${email.subject}
From: ${email.author}
To: ${email.recipients.join(", ")}
Date: ${email.date.toLocaleString()}

${email.body || "(No body content)"}`;
}

function parseToolCall(content: string): { name: string; args: Record<string, any> } | null {
  try {
    const match = content.match(/\{"tool":\s*"([^"]+)",\s*"args":\s*(\{[^}]*\})\}/);
    if (match) {
      return {
        name: match[1],
        args: JSON.parse(match[2]),
      };
    }
  } catch (e) {
    console.error("Failed to parse tool call:", e);
  }
  return null;
}

export async function processEmail(email: EmailInfo, config: Config): Promise<void> {
  const recordId = `${email.id}_${Date.now()}`;

  try {
    const systemPrompt = config[SYSTEM_PROMPT];
    const toolDescriptions = buildToolDefinitions(config);
    const emailContent = buildEmailContent(email);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt + toolDescriptions },
      { role: "user", content: `Please analyze and process this email:\n\n${emailContent}` },
    ];

    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let iteration = 0;
    let isDone = false;

    console.log("========== Email Processing Started ==========");
    console.log("Email ID:", email.id);
    console.log("Record ID:", recordId);
    console.log("Provider:", config[LLM_TYPE]);
    console.log("Model:", config[LLM_MODEL]);

    while (!isDone && iteration < MAX_ITERATIONS) {
      iteration++;
      console.log(`\n========== Iteration ${iteration} ==========`);
      console.log("Messages count:", messages.length);

      const result = await callLLM(config, messages);

      if (result.usage) {
        totalUsage.promptTokens += result.usage.promptTokens;
        totalUsage.completionTokens += result.usage.completionTokens;
        totalUsage.totalTokens += result.usage.totalTokens;
      }

      console.log("LLM Response:", result.content);

      messages.push({ role: "assistant", content: result.content });

      if (result.content.includes("END")) {
        console.log("AI indicated completion with END");
        isDone = true;
        break;
      }

      const toolCall = parseToolCall(result.content);
      if (toolCall) {
        console.log("Tool Call:", toolCall.name, toolCall.args);

        const tool = getTool(toolCall.name);
        if (tool) {
          const ctx: ToolContext = {
            messageHeader: {
              id: email.id,
              date: email.date,
              author: email.author,
              recipients: email.recipients,
              subject: email.subject,
            },
            config,
          };

          const toolResult = await tool.execute(toolCall.args, ctx);
          console.log("Tool Result:", toolResult);

          messages.push({
            role: "user",
            content: `Tool ${toolCall.name} result: ${JSON.stringify(toolResult)}`,
          });
        } else {
          console.error("Tool not found:", toolCall.name);
          messages.push({
            role: "user",
            content: `Error: Tool "${toolCall.name}" not found.`,
          });
        }
      } else {
        console.log("No tool call detected, ending conversation");
        isDone = true;
      }
    }

    if (iteration >= MAX_ITERATIONS) {
      console.log("Max iterations reached, ending conversation");
    }

    console.log("========== Processing Complete ==========");
    console.log("Total iterations:", iteration);
    console.log("Total usage:", totalUsage);

    await saveChatRecord(
      messages,
      messages[messages.length - 1].content,
      {
        model: config[LLM_MODEL],
        provider: config[LLM_TYPE],
        usage: totalUsage,
      },
      recordId
    );

    console.log("Chat record saved:", recordId);
  } catch (error) {
    console.error(`Failed to process email ${email.id}:`, error);

    await saveChatRecord(
      [{ role: "user", content: `Email: ${email.subject}` }],
      `Error: ${error instanceof Error ? error.message : String(error)}`,
      {
        model: config[LLM_MODEL],
        provider: config[LLM_TYPE],
      },
      recordId
    );
  }
}
