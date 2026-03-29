import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { google } from "googleapis";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gmailTokens } from "@/db/schema";
import { oauth2Client } from "@/lib/google/gmail";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");

    if (!code || state !== userId) {
      return new Response(
        `Invalid callback. state=${state}, userId=${userId}`,
        {
          status: 400,
        },
      );
    }

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return new Response(
        `Failed to obtain tokens. Got: ${JSON.stringify({ hasAccess: !!tokens.access_token, hasRefresh: !!tokens.refresh_token })}`,
        { status: 400 },
      );
    }

    // Get user's Gmail address
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    const tokenData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date!),
      email: data.email!,
      updatedAt: new Date(),
    };

    // Upsert token row
    const [existing] = await db
      .select()
      .from(gmailTokens)
      .where(eq(gmailTokens.clerkUserId, userId));

    if (existing) {
      await db
        .update(gmailTokens)
        .set(tokenData)
        .where(eq(gmailTokens.clerkUserId, userId));
    } else {
      await db
        .insert(gmailTokens)
        .values({ clerkUserId: userId, ...tokenData });
    }

    return NextResponse.redirect(
      new URL("/deals/board?gmail=connected", req.url),
    );
  } catch (error) {
    console.error("Gmail callback error:", error);
    return new Response(
      `Gmail callback failed: ${error instanceof Error ? error.message : String(error)}`,
      { status: 500 },
    );
  }
}
