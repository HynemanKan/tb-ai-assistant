/// <reference types="thunderbird-webext-browser" />
import { migrateConfig, getConfig } from "./utils/ConfigManager";
import { SENDER_FILTER_RULES } from "./utils/Config";
import { processEmail, type EmailInfo } from "./agent";
import { extractEmailContent } from "./utils/emailParser";

function shouldFilterSender(sender: string, filterRules: string[]): boolean {
  if (filterRules.length === 0) {
    return false;
  }

  const normalizedSender = sender.toLowerCase().trim();

  for (const rule of filterRules) {
    const normalizedRule = rule.toLowerCase().trim();
    if (!normalizedRule) continue;

    if (normalizedRule.startsWith("@")) {
      if (normalizedSender.endsWith(normalizedRule)) {
        return true;
      }
    } else {
      if (normalizedSender === normalizedRule || normalizedSender.includes(normalizedRule)) {
        return true;
      }
    }
  }

  return false;
}

async function buildEmailInfo(messageId: number): Promise<EmailInfo> {
  const message = await messenger.messages.get(messageId);
  const fullMessage = await messenger.messages.getFull(messageId);
  const body = extractEmailContent(fullMessage);

  return {
    id: message.id,
    subject: message.subject || "(No subject)",
    author: message.author,
    recipients: message.recipients || [],
    date: message.date,
    body: body,
  };
}

async function main() {
  console.clear();
  console.info("TB AI Assistant starting...");

  await migrateConfig();
  console.info("Config migration check completed");

  messenger.runtime.onMessage.addListener((message: any) => {
    if (message?.action === "rerun") {
      const messageId = message.messageId as number;
      console.info("Rerun request received for message:", messageId);

      return (async () => {
        try {
          const emailInfo = await buildEmailInfo(messageId);
          const config = await getConfig();
          console.info("Rerun processing email:", emailInfo.subject);
          await processEmail(emailInfo, config);
          console.info("Rerun completed for message:", messageId);
          return { success: true };
        } catch (error) {
          console.error("Rerun failed:", error);
          return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
      })();
    }
  });

  console.info("Adding mail received listener");
  messenger.messages.onNewMailReceived.addListener(async (folder, messageList) => {
    console.info("New mail received in folder:", folder.name);
    console.info("Message count:", messageList.messages.length);

    for (const message of messageList.messages) {
      try {
        const config = await getConfig();
        const filterRules = config[SENDER_FILTER_RULES];

        if (shouldFilterSender(message.author, filterRules)) {
          console.info("Skipping email from filtered sender:", message.author);
          continue;
        }

        const emailInfo = await buildEmailInfo(message.id);

        console.info("Processing email:", emailInfo.subject);
        await processEmail(emailInfo, config);
      } catch (error) {
        console.error("Failed to process message:", error);
      }
    }
  });
  console.info("Mail received listener added successfully");
}

main();
