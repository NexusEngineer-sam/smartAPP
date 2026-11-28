import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.nexus.campus",
  appName: "NEXUS",
  webDir: "capacitor-web",
  ...(serverUrl ? { server: { url: serverUrl, cleartext: false } } : {}),
};

export default config;
