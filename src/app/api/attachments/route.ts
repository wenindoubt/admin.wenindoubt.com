import { auth } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const ALLOWED_TYPES: Record<string, number> = {
  "application/pdf": 10 * 1024 * 1024,
  "image/png": 5 * 1024 * 1024,
  "image/jpeg": 5 * 1024 * 1024,
  "image/webp": 5 * 1024 * 1024,
  "text/plain": 2 * 1024 * 1024,
  "text/markdown": 2 * 1024 * 1024,
  "text/csv": 2 * 1024 * 1024,
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const maxSize = ALLOWED_TYPES[file.type];
  if (!maxSize) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}` },
      { status: 400 },
    );
  }
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit` },
      { status: 400 },
    );
  }

  const storagePath = `${userId}/${crypto.randomUUID()}_${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage
    .from("note-attachments")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Storage upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    storagePath,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
}
