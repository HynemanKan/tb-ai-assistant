import type { Config } from "@/utils/ConfigManager";
import { LLM_TYPE, LLM_API_ENDPOINT, LLM_KEY, LLM_MODEL } from "@/utils/Config";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

function createOpenAI(config: Config) {
  return new ChatOpenAI({
    modelName: config[LLM_MODEL],
    apiKey: config[LLM_KEY],
    configuration: {
      baseURL: config[LLM_API_ENDPOINT],
    },
  });
}

function createOllama(config: Config) {
  return new ChatOllama({
    model: config[LLM_MODEL],
    baseUrl: config[LLM_API_ENDPOINT],
  });
}

function convertMessages(messages: ChatMessage[]): BaseMessage[] {
  return messages.map((msg) => {
    switch (msg.role) {
      case "system":
        return new SystemMessage(msg.content);
      case "user":
        return new HumanMessage(msg.content);
      case "assistant":
        return new AIMessage(msg.content);
      default:
        throw new Error(`Unknown message role: ${msg.role}`);
    }
  });
}

async function callOpenAI(config: Config, messages: ChatMessage[]): Promise<LLMResponse> {
  const llm = createOpenAI(config);
  const langchainMessages = convertMessages(messages);
  const response = await llm.invoke(langchainMessages);

  const usage = response.usage_metadata as {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  } | undefined;

  return {
    content: response.content as string,
    usage: usage ? {
      promptTokens: usage.input_tokens ?? 0,
      completionTokens: usage.output_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    } : undefined,
  };
}

async function callOllama(config: Config, messages: ChatMessage[]): Promise<LLMResponse> {
  const llm = createOllama(config);
  const langchainMessages = convertMessages(messages);
  const response = await llm.invoke(langchainMessages);

  const usage = response.usage_metadata as {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  } | undefined;

  return {
    content: response.content as string,
    usage: usage ? {
      promptTokens: usage.input_tokens ?? 0,
      completionTokens: usage.output_tokens ?? 0,
      totalTokens: usage.total_tokens ?? 0,
    } : undefined,
  };
}

export async function callLLM(config: Config, messages: ChatMessage[]): Promise<LLMResponse> {
  const provider = config[LLM_TYPE];

  switch (provider) {
    case "OPENAI":
      return callOpenAI(config, messages);
    case "OLLAMA":
      return callOllama(config, messages);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export async function testLLMConfig(config: Config): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    const messages: ChatMessage[] = [
      { role: "user", content: "who are you" },
    ];

    const result = await callLLM(config, messages);

    return {
      success: true,
      response: result.content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
