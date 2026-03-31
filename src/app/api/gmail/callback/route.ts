import { auth } from "@clerk/nextjs/server";
import { google } from "googleapis";
import { type NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { gmailTokens } from "@/db/schema";
import { createOAuth2Client, oauth2Client } from "@/lib/google/gmail";

function popupCloseResponse(status: "connected" | "error") {
  const html = `<!DOCTYPE html><html><body><script>
if(window.opener){window.opener.postMessage({type:"gmail-${status}"},location.origin)}
window.close();
</script><p>You can close this window.</p></body></html>`;
  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const cookieNonce = req.cookies.get("gmail_oauth_nonce")?.value;

    const [stateUserId, stateNonce] = (state ?? "").split(":");
    if (
      !code ||
      stateUserId !== userId ||
      !stateNonce ||
      stateNonce !== cookieNonce
    ) {
      return popupCloseResponse("error");
    }

    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.access_token || !tokens.refresh_token) {
      return popupCloseResponse("error");
    }

    const client = createOAuth2Client();
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();

    const tokenData = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(tokens.expiry_date!),
      email: data.email!,
      updatedAt: new Date(),
    };

    await db
      .insert(gmailTokens)
      .values({ clerkUserId: userId, ...tokenData })
      .onConflictDoUpdate({
        target: gmailTokens.clerkUserId,
        set: tokenData,
      });

    const response = popupCloseResponse("connected");
    response.cookies.delete("gmail_oauth_nonce");
    return response;
  } catch (error) {
    console.error("Gmail callback error:", error);
    return popupCloseResponse("error");
  }
}
