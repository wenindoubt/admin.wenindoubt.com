import { google } from "googleapis";

/** Create a fresh OAuth2 client (use for per-request Gmail operations) */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_REDIRECT_URI,
  );
}

/**
 * Shared singleton for stateless OAuth flows (authorize URL generation, token exchange).
 * NEVER call setCredentials() on this — use createOAuth2Client() for per-user operations.
 */
const globalForOAuth = globalThis as unknown as {
  oauth2Client: InstanceType<typeof google.auth.OAuth2> | undefined;
};

export const oauth2Client = globalForOAuth.oauth2Client ?? createOAuth2Client();

if (process.env.NODE_ENV !== "production") {
  globalForOAuth.oauth2Client = oauth2Client;
}

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/userinfo.email",
];
