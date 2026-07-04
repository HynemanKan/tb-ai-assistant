<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import {
  getAllChatRecords,
  deleteChatRecord,
  clearAllChatRecords,
  type ChatRecord,
} from "./utils/ChatHistory";
import { LLM_TYPE, LLM_MODEL } from "./utils/Config";

const chatRecords = ref<ChatRecord[]>([]);
const isLoading = ref(true);
const expandedId = ref<string | null>(null);
const rerunningId = ref<string | null>(null);

function t(messageName: string): string {
  return browser.i18n.getMessage(messageName) || messageName;
}

async function loadRecords() {
  isLoading.value = true;
  try {
    chatRecords.value = await getAllChatRecords(100);
  } catch (error) {
    console.error("Failed to load chat records:", error);
  } finally {
    isLoading.value = false;
  }
}

async function handleDelete(id: string) {
  try {
    await deleteChatRecord(id);
    chatRecords.value = chatRecords.value.filter((r) => r.id !== id);
  } catch (error) {
    console.error("Failed to delete record:", error);
  }
}

async function handleClearAll() {
  if (!confirm(t("clearAllConfirm"))) return;

  try {
    await clearAllChatRecords();
    chatRecords.value = [];
  } catch (error) {
    console.error("Failed to clear records:", error);
  }
}

async function handleRerun(record: ChatRecord) {
  if (!record.messageId) {
    alert("No message ID stored for this record, cannot rerun.");
    return;
  }

  rerunningId.value = record.id;
  try {
    await browser.runtime.sendMessage({
      action: "rerun",
      messageId: record.messageId,
    });
  } catch (error) {
    console.error("Failed to send rerun message:", error);
    alert("Failed to rerun: " + (error instanceof Error ? error.message : String(error)));
  } finally {
    rerunningId.value = null;
  }
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

onMounted(() => {
  loadRecords();
});
</script>

<template>
  <div class="history-container">
    <div class="history-header">
      <h1>{{ t("chatHistoryTitle") }}</h1>
      <div class="header-actions">
        <button class="btn-secondary" @click="loadRecords">
          {{ t("refreshButton") }}
        </button>
        <button
          class="btn-danger"
          @click="handleClearAll"
          :disabled="chatRecords.length === 0"
        >
          {{ t("clearAllButton") }}
        </button>
      </div>
    </div>

    <div v-if="isLoading" class="loading">{{ t("loading") }}</div>

    <div v-else-if="chatRecords.length === 0" class="empty-state">
      {{ t("noRecords") }}
    </div>

    <div v-else class="records-list">
      <div
        v-for="record in chatRecords"
        :key="record.id"
        class="record-item"
        :class="{ expanded: expandedId === record.id }"
      >
        <div class="record-header" @click="toggleExpand(record.id)">
          <div class="record-info">
            <span class="record-time">{{ formatDate(record.createdAt) }}</span>
            <span v-if="record.metadata?.model" class="record-model">
              {{ record.metadata.model }}
            </span>
          </div>
          <div class="record-preview">
            {{ truncateText(record.response) }}
          </div>
          <button
            v-if="record.messageId"
            class="btn-icon btn-rerun"
            :disabled="rerunningId === record.id"
            @click.stop="handleRerun(record)"
            :title="t('rerunButton')"
          >
            {{ rerunningId === record.id ? "..." : "↻" }}
          </button>
          <button
            class="btn-icon btn-danger"
            @click.stop="handleDelete(record.id)"
            :title="t('deleteButton')"
          >
            ✕
          </button>
        </div>

        <div v-if="expandedId === record.id" class="record-detail">
          <div class="detail-section">
            <h3>{{ t("userMessage") }}</h3>
            <div
              v-for="(msg, idx) in record.messages"
              :key="idx"
              class="message"
              :class="msg.role"
            >
              <span class="message-role">{{ msg.role }}:</span>
              <pre class="message-content">{{ msg.content }}</pre>
            </div>
          </div>

          <div class="detail-section">
            <h3>{{ t("assistantResponse") }}</h3>
            <pre class="response-content">{{ record.response }}</pre>
          </div>

          <div v-if="record.metadata?.usage" class="detail-section usage">
            <span>{{ t("promptTokens") }}: {{ record.metadata.usage.promptTokens }}</span>
            <span>{{ t("completionTokens") }}: {{ record.metadata.usage.completionTokens }}</span>
            <span>{{ t("totalTokens") }}: {{ record.metadata.usage.totalTokens }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #f0f0f0;
  background-color: #1a1a1a;
  min-height: 100vh;
  box-sizing: border-box;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.history-header h1 {
  margin: 0;
  font-size: 24px;
  color: #f0f0f0;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #a0a0a0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #a0a0a0;
  background-color: #252525;
  border-radius: 8px;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-item {
  border: 1px solid #404040;
  border-radius: 8px;
  overflow: hidden;
  background-color: #252525;
}

.record-item.expanded {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.record-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.record-header:hover {
  background-color: #3a3a3a;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 160px;
}

.record-time {
  font-size: 14px;
  color: #f0f0f0;
  font-weight: 500;
}

.record-model {
  font-size: 12px;
  color: #a0a0a0;
  background-color: #333333;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.record-preview {
  flex: 1;
  font-size: 14px;
  color: #a0a0a0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-detail {
  border-top: 1px solid #404040;
  padding: 16px;
  background-color: #1a1a1a;
}

.detail-section {
  margin-bottom: 16px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h3 {
  font-size: 14px;
  color: #f0f0f0;
  margin: 0 0 8px 0;
}

.message {
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.message.user {
  background-color: #1e3a5f;
}

.message.system {
  background-color: #3d2e1f;
}

.message.assistant {
  background-color: #1f3d2e;
}

.message-role {
  font-weight: 600;
  font-size: 12px;
  color: #a0a0a0;
  display: block;
  margin-bottom: 4px;
}

.message-content,
.response-content {
  margin: 0;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  line-height: 1.5;
  color: #f0f0f0;
}

.usage {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #a0a0a0;
  padding-top: 8px;
  border-top: 1px solid #404040;
  flex-wrap: wrap;
}

.btn-secondary,
.btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-secondary {
  background-color: #333333;
  color: #f0f0f0;
  border: 1px solid #404040;
}

.btn-secondary:hover {
  background-color: #3a3a3a;
}

.btn-danger {
  background-color: #4a1f1f;
  color: #f87171;
}

.btn-danger:hover:not(:disabled) {
  background-color: #5a2a2a;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.btn-rerun {
  background-color: #1f3d5a;
  color: #60a5fa;
}

.btn-rerun:hover:not(:disabled) {
  background-color: #2a4f72;
}

.btn-rerun:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 600px) {
  .history-container {
    padding: 16px;
  }
  
  .history-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .history-header h1 {
    font-size: 20px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .header-actions button {
    flex: 1;
  }
  
  .record-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .record-info {
    width: 100%;
  }
  
  .record-preview {
    width: 100%;
  }
  
  .usage {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
