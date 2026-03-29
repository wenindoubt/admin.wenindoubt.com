import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { GMAIL_SCOPES, oauth2Client } from "@/lib/google/gmail";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GMAIL_SCOPES,
    prompt: "consent",
    state: userId,
  });

  return NextResponse.redirect(authUrl);
}
