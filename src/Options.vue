<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  getConfig,
  saveConfig,
  defaultConfig,
  LLM_TYPES,
  TOOL_GROUPS,
  type Config,
} from "./utils/ConfigManager";
import {
  LLM_TYPE,
  LLM_API_ENDPOINT,
  LLM_KEY,
  LLM_MODEL,
  TOOL_ENABLE,
  SYSTEM_PROMPT,
  TAG_DESCRIPTIONS,
  SENDER_FILTER_RULES,
} from "./utils/Config";
import { testLLMConfig } from "./agent";
import { TOOL_GROUP_MAP } from "./tools";

interface MailTag {
  key: string;
  tag: string;
  color: string;
  ordinal: string;
}

const config = ref<Config>({ ...defaultConfig });
const statusMessage = ref("");
const isLoading = ref(true);
const mailTags = ref<MailTag[]>([]);

const isTestingLLM = ref(false);
const testResult = ref<{ success: boolean; response?: string; error?: string } | null>(null);
const newFilterRule = ref("");

function t(messageName: string): string {
  return browser.i18n.getMessage(messageName) || messageName;
}

async function loadMailTags() {
  try {
    const tags = await messenger.messages.listTags();
    mailTags.value = tags as MailTag[];
  } catch (error) {
    console.error("Failed to load mail tags:", error);
    mailTags.value = [];
  }
}

function cleanupDeletedTags() {
  const existingTagKeys = new Set(mailTags.value.map((tag) => tag.key));
  const configTagKeys = Object.keys(config.value[TAG_DESCRIPTIONS]);

  for (const key of configTagKeys) {
    if (!existingTagKeys.has(key)) {
      delete config.value[TAG_DESCRIPTIONS][key];
    }
  }
}

async function loadConfig() {
  isLoading.value = true;
  try {
    config.value = await getConfig();
    await loadMailTags();
    cleanupDeletedTags();
  } catch (error) {
    console.error("Failed to load config:", error);
    statusMessage.value = t("saveError");
  } finally {
    isLoading.value = false;
  }
}

async function handleSave() {
  try {
    await saveConfig(config.value);
    statusMessage.value = t("saveSuccess");
    setTimeout(() => {
      statusMessage.value = "";
    }, 3000);
  } catch (error) {
    console.error("Failed to save config:", error);
    statusMessage.value = t("saveError");
  }
}

function handleReset() {
  config.value = { ...defaultConfig };
}

async function handleTestLLM() {
  isTestingLLM.value = true;
  testResult.value = null;

  try {
    const result = await testLLMConfig(config.value);
    testResult.value = result;
  } catch (error) {
    testResult.value = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    isTestingLLM.value = false;
  }
}

function toggleTool(tool: string) {
  const index = config.value[TOOL_ENABLE].indexOf(tool as any);
  if (index === -1) {
    config.value[TOOL_ENABLE].push(tool as any);
  } else {
    config.value[TOOL_ENABLE].splice(index, 1);
  }
}

function getToolLabel(tool: string): string {
  const toolLabels: Record<string, string> = {
    MAIL_TAG: t("toolMailTag"),
  };
  return toolLabels[tool] || tool;
}

const tagDescriptionsList = computed(() => {
  return mailTags.value.map((tag) => ({
    key: tag.key,
    name: tag.tag,
    color: tag.color,
    description: config.value[TAG_DESCRIPTIONS][tag.key]?.description || "",
    disabled: config.value[TAG_DESCRIPTIONS][tag.key]?.disabled || false,
  }));
});

function ensureTagConfig(key: string) {
  if (!config.value[TAG_DESCRIPTIONS][key]) {
    const tag = mailTags.value.find((t) => t.key === key);
    config.value[TAG_DESCRIPTIONS][key] = {
      name: tag?.tag || key,
      description: "",
      disabled: false,
    };
  }
}

function updateTagDescription(key: string, description: string) {
  ensureTagConfig(key);
  config.value[TAG_DESCRIPTIONS][key].description = description;
}

function toggleTagEnabled(key: string) {
  ensureTagConfig(key);
  config.value[TAG_DESCRIPTIONS][key].disabled = !config.value[TAG_DESCRIPTIONS][key].disabled;
}

function addFilterRule() {
  const rule = newFilterRule.value.trim();
  if (rule && !config.value[SENDER_FILTER_RULES].includes(rule)) {
    config.value[SENDER_FILTER_RULES].push(rule);
    newFilterRule.value = "";
  }
}

function removeFilterRule(index: number) {
  config.value[SENDER_FILTER_RULES].splice(index, 1);
}

onMounted(() => {
  loadConfig();
});
</script>

<template>
  <div class="options-container">
    <div class="header">
      <h1>{{ t("optionsTitle") }}</h1>
      <a href="chat-history.html" class="btn-link" target="_blank">
        {{ t("viewChatHistory") }}
      </a>
    </div>

    <div v-if="isLoading" class="loading">Loading...</div>

    <form v-else @submit.prevent="handleSave" class="options-form">
      <div class="form-group">
        <label :for="LLM_TYPE">{{ t("llmTypeLabel") }}</label>
        <select :id="LLM_TYPE" v-model="config[LLM_TYPE]">
          <option v-for="type in LLM_TYPES" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label :for="LLM_API_ENDPOINT">{{ t("llmApiEndpointLabel") }}</label>
        <input
          :id="LLM_API_ENDPOINT"
          type="url"
          v-model="config[LLM_API_ENDPOINT]"
          placeholder="https://api.example.com/v1"
        />
      </div>

      <div class="form-group">
        <label :for="LLM_KEY">{{ t("llmApiKeyLabel") }}</label>
        <input
          :id="LLM_KEY"
          type="password"
          v-model="config[LLM_KEY]"
          placeholder="sk-..."
        />
      </div>

      <div class="form-group">
        <label :for="LLM_MODEL">{{ t("llmModelLabel") }}</label>
        <div class="model-input-group">
          <input
            :id="LLM_MODEL"
            type="text"
            v-model="config[LLM_MODEL]"
            placeholder="gpt-4"
          />
          <button
            type="button"
            class="btn-test"
            @click="handleTestLLM"
            :disabled="isTestingLLM"
          >
            {{ isTestingLLM ? t("testingButton") : t("testButton") }}
          </button>
        </div>
        <div v-if="testResult" class="test-result" :class="{ success: testResult.success, error: !testResult.success }">
          <div v-if="testResult.success">
            <strong>{{ t("testSuccess") }}</strong>
            <p>{{ testResult.response }}</p>
          </div>
          <div v-else>
            <strong>{{ t("testFailed") }}</strong>
            <p>{{ testResult.error }}</p>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>{{ t("toolEnableLabel") }}</label>
        <div class="checkbox-group">
          <div
            v-for="tool in TOOL_GROUPS"
            :key="tool"
            class="tool-group-item"
          >
            <label class="checkbox-label">
              <input
                type="checkbox"
                :checked="config[TOOL_ENABLE].includes(tool as any)"
                @change="toggleTool(tool)"
              />
              {{ getToolLabel(tool) }}
            </label>
            <div class="tool-list">
              <span
                v-for="toolName in TOOL_GROUP_MAP[tool]"
                :key="toolName"
                class="tool-name"
              >
                {{ toolName }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>{{ t("senderFilterRulesLabel") }}</label>
        <p class="form-hint">{{ t("senderFilterRulesHint") }}</p>

        <div class="filter-rules-input">
          <input
            type="text"
            v-model="newFilterRule"
            :placeholder="t('senderFilterPlaceholder')"
            @keyup.enter="addFilterRule"
          />
          <button type="button" class="btn-add" @click="addFilterRule">
            {{ t("addButton") }}
          </button>
        </div>

        <div v-if="config[SENDER_FILTER_RULES].length > 0" class="filter-rules-list">
          <div
            v-for="(rule, index) in config[SENDER_FILTER_RULES]"
            :key="index"
            class="filter-rule-item"
          >
            <span class="filter-rule-text">{{ rule }}</span>
            <button type="button" class="btn-remove" @click="removeFilterRule(index)">
              ×
            </button>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label :for="SYSTEM_PROMPT">{{ t("systemPromptLabel") }}</label>
        <textarea
          :id="SYSTEM_PROMPT"
          v-model="config[SYSTEM_PROMPT]"
          rows="8"
          :placeholder="t('systemPromptPlaceholder')"
        ></textarea>
      </div>

      <div class="form-group">
        <label>{{ t("tagDescriptionsLabel") }}</label>
        <p class="form-hint">{{ t("tagDescriptionsHint") }}</p>

        <div v-if="tagDescriptionsList.length === 0" class="no-tags">
          {{ t("noTagsFound") }}
        </div>

        <div v-else class="tag-list">
          <div
            v-for="tag in tagDescriptionsList"
            :key="tag.key"
            class="tag-item"
            :class="{ 'tag-disabled': tag.disabled }"
          >
            <div class="tag-item-header">
              <label class="tag-toggle">
                <input
                  type="checkbox"
                  :checked="!tag.disabled"
                  @change="toggleTagEnabled(tag.key)"
                />
                <span
                  class="tag-color"
                  :style="{ backgroundColor: tag.color }"
                ></span>
                <span class="tag-name">{{ tag.name }}</span>
              </label>
              <span class="tag-key">{{ tag.key }}</span>
            </div>
            <textarea
              :value="tag.description"
              @input="updateTagDescription(tag.key, ($event.target as HTMLTextAreaElement).value)"
              class="tag-description-input"
              rows="2"
              :placeholder="t('tagDescriptionPlaceholder')"
              :disabled="tag.disabled"
            ></textarea>
          </div>
        </div>
      </div>

      <div class="button-group">
        <button type="submit" class="btn-primary">
          {{ t("saveButton") }}
        </button>
        <button type="button" class="btn-secondary" @click="handleReset">
          {{ t("resetButton") }}
        </button>
      </div>

      <div v-if="statusMessage" class="status-message">
        {{ statusMessage }}
      </div>
    </form>
  </div>
</template>

<style scoped>
.options-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #f0f0f0;
  background-color: #1a1a1a;
  min-height: 100vh;
  box-sizing: border-box;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

h1 {
  margin: 0;
  font-size: 24px;
  color: #f0f0f0;
}

.btn-link {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  background-color: #2a2a2a;
  color: #f0f0f0;
  transition: background-color 0.2s;
}

.btn-link:hover {
  background-color: #3a3a3a;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #a0a0a0;
}

.options-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group > label {
  font-weight: 600;
  color: #f0f0f0;
}

.form-hint {
  font-size: 13px;
  color: #a0a0a0;
  margin: 0;
}

input[type="url"],
input[type="password"],
input[type="text"],
select,
textarea {
  padding: 10px 12px;
  border: 1px solid #404040;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
  background-color: #2a2a2a;
  color: #f0f0f0;
}

input[type="url"]:focus,
input[type="password"]:focus,
input[type="text"]:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

select {
  cursor: pointer;
}

textarea {
  resize: vertical;
  font-family: inherit;
  line-height: 1.5;
}

textarea:disabled {
  background-color: #3a3a3a;
  color: #666666;
  cursor: not-allowed;
}

.model-input-group {
  display: flex;
  gap: 8px;
}

.model-input-group input {
  flex: 1;
}

.btn-test {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background-color: #10b981;
  color: white;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.btn-test:hover:not(:disabled) {
  background-color: #059669;
}

.btn-test:disabled {
  background-color: #4b5563;
  cursor: not-allowed;
}

.test-result {
  padding: 12px;
  border-radius: 6px;
  margin-top: 8px;
}

.test-result.success {
  background-color: #064e3b;
  color: #6ee7b7;
}

.test-result.error {
  background-color: #7f1d1d;
  color: #fca5a5;
}

.test-result strong {
  display: block;
  margin-bottom: 4px;
}

.test-result p {
  margin: 0;
  font-size: 14px;
  word-break: break-word;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-group-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border: 1px solid #404040;
  border-radius: 6px;
  background-color: #2a2a2a;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 600;
  color: #f0f0f0;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.tool-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-left: 26px;
}

.tool-name {
  font-size: 12px;
  padding: 2px 8px;
  background-color: #404040;
  border-radius: 4px;
  color: #d4d4d4;
  font-family: monospace;
}

.no-tags {
  padding: 20px;
  text-align: center;
  color: #a0a0a0;
  background-color: #2a2a2a;
  border-radius: 6px;
}

.tag-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tag-item {
  border: 1px solid #404040;
  border-radius: 6px;
  padding: 12px;
  background-color: #2a2a2a;
}

.tag-item.tag-disabled {
  opacity: 0.6;
  background-color: #3a3a3a;
}

.tag-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
}

.tag-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #3b82f6;
}

.tag-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

.tag-name {
  font-weight: 600;
  color: #f0f0f0;
}

.tag-key {
  font-size: 12px;
  color: #808080;
  font-family: monospace;
}

.tag-description-input {
  width: 100%;
  box-sizing: border-box;
}

.button-group {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-secondary {
  background-color: #2a2a2a;
  color: #f0f0f0;
  border: 1px solid #404040;
}

.btn-secondary:hover {
  background-color: #3a3a3a;
}

.btn-secondary:active {
  transform: scale(0.98);
}

.status-message {
  padding: 12px;
  border-radius: 6px;
  background-color: #064e3b;
  color: #6ee7b7;
  text-align: center;
}

.filter-rules-input {
  display: flex;
  gap: 8px;
}

.filter-rules-input input {
  flex: 1;
}

.btn-add {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background-color: #3b82f6;
  color: white;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.btn-add:hover {
  background-color: #2563eb;
}

.filter-rules-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.filter-rule-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: #2a2a2a;
  border: 1px solid #404040;
  border-radius: 6px;
}

.filter-rule-text {
  font-family: monospace;
  color: #f0f0f0;
}

.btn-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  background-color: #ef4444;
  color: white;
  line-height: 1;
  transition: background-color 0.2s;
}

.btn-remove:hover {
  background-color: #dc2626;
}

@media (max-width: 600px) {
  .options-container {
    padding: 16px;
  }

  h1 {
    font-size: 20px;
  }

  .header {
    flex-direction: column;
    align-items: flex-start;
  }

  .model-input-group {
    flex-direction: column;
  }

  .button-group {
    flex-direction: column;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }

  .filter-rules-input {
    flex-direction: column;
  }
}
</style>
