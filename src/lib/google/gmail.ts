import { google } from "googleapis";

const globalForOAuth = globalThis as unknown as {
  oauth2Client: InstanceType<typeof google.auth.OAuth2> | undefined;
};

export const oauth2Client =
  globalForOAuth.oauth2Client ??
  new google.auth.OAuth2(
    process.env.GOOGLE_GMAIL_CLIENT_ID,
    process.env.GOOGLE_GMAIL_CLIENT_SECRET,
    process.env.GOOGLE_GMAIL_REDIRECT_URI,
  );

if (process.env.NODE_ENV !== "production") {
  globalForOAuth.oauth2Client = oauth2Client;
}

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.settings.basic",
  "https://www.googleapis.com/auth/userinfo.email",
];
