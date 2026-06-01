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

async function main() {
  console.clear();
  console.info("TB AI Assistant starting...");

  await migrateConfig();
  console.info("Config migration check completed");

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

        const fullMessage = await messenger.messages.getFull(message.id);
        const body = extractEmailContent(fullMessage);

        const emailInfo: EmailInfo = {
          id: message.id,
          subject: message.subject || "(No subject)",
          author: message.author,
          recipients: message.recipients || [],
          date: message.date,
          body: body,
        };

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
