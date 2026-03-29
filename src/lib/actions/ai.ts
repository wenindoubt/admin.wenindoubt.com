"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { dealInsights } from "@/db/schema";

export async function deleteInsight(insightId: string, dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(dealInsights)
    .where(
      and(eq(dealInsights.id, insightId), eq(dealInsights.dealId, dealId)),
    );

  revalidatePath(`/deals/${dealId}`);
}
