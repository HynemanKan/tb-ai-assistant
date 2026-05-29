/// <reference types="thunderbird-webext-browser" />
import { migrateConfig, getConfig } from "./utils/ConfigManager";
import { processEmail, type EmailInfo } from "./agent";
import { extractEmailContent } from "./utils/emailParser";

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

        const config = await getConfig();

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
