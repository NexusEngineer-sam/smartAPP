import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";

function encryptionKey() {
  const raw = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY haijawekwa.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY lazima iwe base64 ya bytes 32.");
  return key;
}

export function encryptRefreshToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv.toString("base64"), cipher.getAuthTag().toString("base64"), encrypted.toString("base64")].join(".");
}

export function decryptRefreshToken(value: string) {
  const [ivPart, tagPart, dataPart] = value.split(".");
  if (!ivPart || !tagPart || !dataPart) throw new Error("Hifadhi ya token si sahihi.");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataPart, "base64")), decipher.final()]).toString("utf8");
}

export function googleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET && process.env.GOOGLE_DRIVE_REDIRECT_URI && process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY);
}

export function googleDriveAuthorizationUrl(state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_DRIVE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", process.env.GOOGLE_DRIVE_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", `openid email ${DRIVE_SCOPE}`);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function getGoogleAccessToken(encryptedRefreshToken: string) {
  const refreshToken = decryptRefreshToken(encryptedRefreshToken);
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_DRIVE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, cache: "no-store" });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error("Google imeshindwa kuthibitisha Drive. Unganisha Google account tena.");
  return String(data.access_token);
}

export async function uploadBackupToGoogleDrive(accessToken: string, fileName: string, json: string) {
  const metadata = { name: fileName, mimeType: "application/json", parents: ["appDataFolder"] };
  const boundary = "campus_backup_" + randomBytes(12).toString("hex");
  const multipart = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${json}\r\n`,
    `--${boundary}--`,
  ].join("");
  const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,createdTime", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
    body: multipart,
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok || !result.id) throw new Error("Google Drive haikukubali backup. Jaribu tena.");
  return result as { id: string; name: string; mimeType: string; createdTime: string };
}
