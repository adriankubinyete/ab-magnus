import IxcSoftClient from "./client.js";

const config = {
  baseUrl: process.env.IXCSOFT_BASE_URL,
  apiToken: process.env.IXCSOFT_API_TOKEN,
};

if (!config.baseUrl || !config.apiToken) {
  throw new Error('IxcSoftClient: Credentials not found in environment variables');
}

const ixcsoftClient = new IxcSoftClient(config);

export default ixcsoftClient;