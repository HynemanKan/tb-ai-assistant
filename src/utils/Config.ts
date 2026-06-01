import * as z from "zod";
import {TOOL_GROUPS} from "@/tools";

export { TOOL_GROUPS };

export const LLM_TYPES= [
    "OPENAI",
    "OLLAMA",
]




export const LLM_TYPE= 'LLM_TYPE'
export const LlmType = z.enum(LLM_TYPES)

export const LLM_API_ENDPOINT = "LLM_API_ENDPOINT";
export const llmApiEndpoint = z.url()

export const LLM_KEY = "LLM_KEY"
export const llmKey = z.string()

export const LLM_MODEL= "LLM_MODEL"
export const llmModel = z.string()

export const TOOL_ENABLE = "TOOL_ENABLE"
export const llmKeyEnable = z.array(z.enum(TOOL_GROUPS))

export const CONFIG_VERSION = "NOW_CONFIG_VERSION"
export const configVersion = z.number()
export const nowConfigVersion = 5

export const SYSTEM_PROMPT = "SYSTEM_PROMPT"
export const systemPrompt = z.string()

export const defaultSystemPrompt = "You are an email tagging assistant. Follow the procedures below strictly:\n" +
    "1. Input: Complete email information including subject, body, sender and recipient.\n" +
    "2. Step 1: Call the tool **Get Available Tags** to retrieve all existing tags along with their definitions and applicable scenarios.\n" +
    "3. Step 2: Analyze the core content, business attributes and purposes of the email subject and body, then select the most appropriate tags from the retrieved list.\n" +
    "4. Step 3: Call the tool **Add Tags** to assign the matched tags to the current email.\n" +
    "\n" +
    "Rules & Requirements:\n" +
    "- Only use the provided available tags. Do not create new tags.\n" +
    "- Prioritize core topics. Multiple relevant tags can be assigned to one email.\n" +
    "- Match tags accurately based on business content and avoid redundant tagging.\n" +
    "- Execute the tasks in the fixed order: Retrieve tags → Match tags → Add tags."

export const TAG_DESCRIPTIONS = "TAG_DESCRIPTIONS"
export const tagDescription = z.object({
    name: z.string(),
    description: z.string(),
    disabled: z.boolean().optional().default(false),
})
export const tagDescriptions = z.record(z.string(), tagDescription)

export const SENDER_FILTER_RULES = "SENDER_FILTER_RULES"
export const senderFilterRules = z.array(z.string())


