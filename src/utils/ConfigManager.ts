import * as z from "zod";
import {
  LLM_TYPE,
  LLM_API_ENDPOINT,
  LLM_KEY,
  LLM_MODEL,
  TOOL_ENABLE,
  CONFIG_VERSION,
  SYSTEM_PROMPT,
  TAG_DESCRIPTIONS,
  SENDER_FILTER_RULES,
  nowConfigVersion,
  LlmType,
  llmApiEndpoint,
  llmKey,
  llmModel,
  llmKeyEnable,
  configVersion,
  systemPrompt,
  defaultSystemPrompt,
  tagDescriptions,
  senderFilterRules,
  LLM_TYPES,
  TOOL_GROUPS,
} from "./Config";

export const ConfigSchema = z.object({
  [LLM_TYPE]: LlmType,
  [LLM_API_ENDPOINT]: llmApiEndpoint,
  [LLM_KEY]: llmKey,
  [LLM_MODEL]: llmModel,
  [TOOL_ENABLE]: llmKeyEnable,
  [CONFIG_VERSION]: configVersion,
  [SYSTEM_PROMPT]: systemPrompt,
  [TAG_DESCRIPTIONS]: tagDescriptions,
  [SENDER_FILTER_RULES]: senderFilterRules,
});

export type Config = z.infer<typeof ConfigSchema>;

export const defaultConfig: Config = {
  [LLM_TYPE]: "OPENAI",
  [LLM_API_ENDPOINT]: "https://api.openai.com/v1",
  [LLM_KEY]: "",
  [LLM_MODEL]: "gpt-4",
  [TOOL_ENABLE]: [],
  [CONFIG_VERSION]: nowConfigVersion,
  [SYSTEM_PROMPT]: defaultSystemPrompt,
  [TAG_DESCRIPTIONS]: {},
  [SENDER_FILTER_RULES]: [],
};

export async function getConfig(): Promise<Config> {
  const result = await browser.storage.local.get(null);
  const storedConfig = result as Partial<Config>;

  if (!storedConfig || Object.keys(storedConfig).length === 0) {
    return { ...defaultConfig };
  }

  const mergedConfig = { ...defaultConfig, ...storedConfig };

  const parseResult = ConfigSchema.safeParse(mergedConfig);
  if (parseResult.success) {
    return parseResult.data;
  }

  console.warn("Invalid config found, returning default config", parseResult.error);
  return { ...defaultConfig };
}

export async function saveConfig(config: Partial<Config>): Promise<void> {
  const currentConfig = await getConfig();
  const newConfig = { ...currentConfig, ...config, [CONFIG_VERSION]: nowConfigVersion };

  const parseResult = ConfigSchema.safeParse(newConfig);
  if (!parseResult.success) {
    throw new Error("Invalid config: " + parseResult.error.message);
  }

  await browser.storage.local.set(parseResult.data);
}

export async function migrateConfig(): Promise<void> {
  const result = await browser.storage.local.get(null);
  const storedConfig = result as Partial<Config>;

  if (!storedConfig || Object.keys(storedConfig).length === 0) {
    await browser.storage.local.set(defaultConfig);
    return;
  }

  const storedVersion = storedConfig[CONFIG_VERSION] ?? 0;

  if (storedVersion < nowConfigVersion) {
    console.info(`Migrating config from version ${storedVersion} to ${nowConfigVersion}`);
    const mergedConfig = { ...defaultConfig, ...storedConfig, [CONFIG_VERSION]: nowConfigVersion };

    const parseResult = ConfigSchema.safeParse(mergedConfig);
    if (parseResult.success) {
      await browser.storage.local.set(parseResult.data);
      console.info("Config migration successful");
    } else {
      console.error("Config migration failed, using default config", parseResult.error);
      await browser.storage.local.set(defaultConfig);
    }
  }
}

export { LLM_TYPES, TOOL_GROUPS };
