"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { google } from "googleapis";
import { db } from "@/db";
import { type Deal, deals, gmailTokens } from "@/db/schema";
import { oauth2Client } from "@/lib/google/gmail";

import { addDealActivity, updateDeal } from "./deals";

/** Check if current user has Gmail connected */
export async function getGmailStatus(): Promise<{
  connected: boolean;
  email?: string;
}> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [token] = await db
    .select({ email: gmailTokens.email })
    .from(gmailTokens)
    .where(eq(gmailTokens.clerkUserId, userId));

  return token ? { connected: true, email: token.email } : { connected: false };
}

/** Get an authenticated Gmail client for a Clerk user, refreshing tokens if needed */
async function getGmailClient(clerkUserId: string) {
  const [token] = await db
    .select()
    .from(gmailTokens)
    .where(eq(gmailTokens.clerkUserId, clerkUserId));

  if (!token) {
    throw new Error(
      "Gmail not connected. Please connect your Gmail account first.",
    );
  }

  oauth2Client.setCredentials({
    access_token: token.accessToken,
    refresh_token: token.refreshToken,
    expiry_date: token.expiresAt.getTime(),
  });

  // Auto-refresh if expired
  if (token.expiresAt.getTime() < Date.now()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    await db
      .update(gmailTokens)
      .set({
        accessToken: credentials.access_token!,
        expiresAt: new Date(credentials.expiry_date!),
        updatedAt: new Date(),
      })
      .where(eq(gmailTokens.clerkUserId, clerkUserId));
    oauth2Client.setCredentials(credentials);
  }

  return google.gmail({ version: "v1", auth: oauth2Client });
}

/** Create a Gmail draft */
export async function createGmailDraft(
  clerkUserId: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ draftId: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const gmail = await getGmailClient(clerkUserId);

  // Fetch user's Gmail signature
  let signature = "";
  try {
    const [token] = await db
      .select({ email: gmailTokens.email })
      .from(gmailTokens)
      .where(eq(gmailTokens.clerkUserId, clerkUserId));
    if (token) {
      const sendAs = await gmail.users.settings.sendAs.get({
        userId: "me",
        sendAsEmail: token.email,
      });
      signature = sendAs.data.signature ?? "";
    }
  } catch {
    // Signature fetch failed — continue without it
  }

  // Build HTML body with signature
  const bodyHtml = body
    .split("\n\n")
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const html = signature
    ? `${bodyHtml}<br><div class="gmail_signature">${signature}</div>`
    : bodyHtml;

  const rawMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    "",
    html,
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const draft = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw: encodedMessage } },
  });

  if (!draft.data.id) throw new Error("Failed to create Gmail draft");
  return { draftId: draft.data.id };
}

/** Create Gmail draft + move deal stage atomically. Draft must succeed for stage to change. */
export async function confirmStageTransitionWithDraft(
  dealId: string,
  toStage: string,
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));

  if (!deal) return { success: false, error: "Deal not found" };

  const gmailUser = deal.assignedTo ?? userId;

  try {
    // 1. Create Gmail draft first — if this fails, don't move the deal
    const { draftId } = await createGmailDraft(gmailUser, to, subject, body);

    // 2. Update deal stage
    await updateDeal(dealId, { stage: toStage as Deal["stage"] });

    // 3. Log email activity
    await addDealActivity(
      dealId,
      "email",
      "Outreach email draft created in Gmail",
      {
        gmail_draft_id: draftId,
        to,
        subject,
      },
    );

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create Gmail draft";
    return { success: false, error: message };
  }
}
