import DiscordWebhookClient from "./client.js";

const config = {
  webhookUrl: process.env.DISCORD_NOTIFICATION_WEBHOOK_URL,
};

if (!config.webhookUrl) {
  throw new Error('DiscordWebhookClient: Webhook URL not found in environment variables');
}

const discordWebhookClient = new DiscordWebhookClient({
    webhookUrl: config.webhookUrl
});

export default discordWebhookClient;