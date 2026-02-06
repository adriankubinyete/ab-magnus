import MagnusBillingClient from "./client.js";

const config = {
  baseUrl: process.env.MAGNUSBILLING_BASE_URL,
  apiKey: process.env.MAGNUSBILLING_API_KEY,
  apiSecret: process.env.MAGNUSBILLING_API_SECRET,
};

if (!config.baseUrl || !config.apiKey || !config.apiSecret) {
  throw new Error('MagnusBillingClient: Credentials not found in environment variables');
}

const magnusClient = new MagnusBillingClient(config);

export default magnusClient;