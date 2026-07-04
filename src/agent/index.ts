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

const MAX_ITERATIONS = 20;

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

  return `\n\nYou have access to the following tools:\n\n${toolDescriptions}\n\nTo use a tool, respond with a JSON object in this format:\n{"tool": "tool_name", "args": {...}}\n\nIMPORTANT: All string values in the JSON must be properly escaped. Escape double quotes inside strings with \\". Do NOT use raw Chinese quotation marks like \u201c\u201d inside JSON strings - use regular escaped quotes or remove them.\nIMPORTANT: You may only call ONE tool per response. Do not output multiple JSON objects.\nWhen you are done with all tasks, respond with "END" on a new line.`;
}

function buildEmailContent(email: EmailInfo): string {
  return `Subject: ${email.subject}
From: ${email.author}
To: ${email.recipients.join(", ")}
Date: ${email.date.toLocaleString()}

${email.body || "(No body content)"}`;
}

function tryLenientParse(str: string): Record<string, any> | null {
  let fixed = str;
  fixed = fixed.replace(/\u201c|\u201d/g, '\\"');
  fixed = fixed.replace(/\u2018|\u2019/g, "\\'");
  try {
    return JSON.parse(fixed);
  } catch {
    // ignore
  }

  const kvPairs: Record<string, any> = {};
  const keyRegex = /"(\w+)"\s*:\s*/g;
  let m: RegExpExecArray | null;
  const keys: { name: string; idx: number }[] = [];

  while ((m = keyRegex.exec(str)) !== null) {
    keys.push({ name: m[1], idx: m.index + m[0].length });
  }

  for (let i = 0; i < keys.length; i++) {
    const start = keys[i].idx;
    const end = i + 1 < keys.length ? str.lastIndexOf(",", keys[i + 1].idx) : str.lastIndexOf("}");
    let val = str.slice(start, end).trim();

    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val === "true") {
      kvPairs[keys[i].name] = true;
      continue;
    } else if (val === "false") {
      kvPairs[keys[i].name] = false;
      continue;
    } else if (!isNaN(Number(val))) {
      kvPairs[keys[i].name] = Number(val);
      continue;
    }

    val = val.replace(/\u201c|\u201d/g, '"').replace(/\u2018|\u2019/g, "'");
    kvPairs[keys[i].name] = val;
  }

  return Object.keys(kvPairs).length > 0 ? kvPairs : null;
}

function parseToolCalls(content: string): { name: string; args: Record<string, any> }[] {
  const calls: { name: string; args: Record<string, any> }[] = [];
  try {
    const regex = /\{"tool"\s*:\s*"([^"]+)"\s*,\s*"args"\s*:\s*\{/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const toolName = match[1];
      const argsStart = match.index + match[0].length - 1;
      let depth = 0;
      let argsEnd = -1;

      for (let i = argsStart; i < content.length; i++) {
        if (content[i] === "{") depth++;
        else if (content[i] === "}") {
          depth--;
          if (depth === 0) {
            argsEnd = i + 1;
            break;
          }
        }
      }

      if (argsEnd === -1) continue;

      const argsStr = content.slice(argsStart, argsEnd);
      try {
        const args = JSON.parse(argsStr);
        calls.push({ name: toolName, args });
      } catch {
        console.warn("Strict JSON parse failed, trying lenient parse for:", toolName);
        const args = tryLenientParse(argsStr);
        if (args) {
          calls.push({ name: toolName, args });
        } else {
          console.error("Failed to parse args for tool:", toolName, argsStr);
        }
      }
    }
  } catch (e) {
    console.error("Failed to parse tool calls:", e);
  }
  return calls;
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

      const toolCalls = parseToolCalls(result.content);
      if (toolCalls.length > 0) {
        // Only process the first tool call
        const toolCall = toolCalls[0];
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

        console.log("Tool Call:", toolCall.name, toolCall.args);

        const tool = getTool(toolCall.name);
        let toolResult: any;
        if (tool) {
          toolResult = await tool.execute(toolCall.args, ctx);
          console.log("Tool Result:", toolCall.name, toolResult);
        } else {
          console.error("Tool not found:", toolCall.name);
          toolResult = { error: "Tool not found" };
        }

        messages.push({
          role: "user",
          content: `${toolCall.name}: ${JSON.stringify(toolResult)}`,
        });
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
      recordId,
      email.id
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
      recordId,
      email.id
    );
  }
}
