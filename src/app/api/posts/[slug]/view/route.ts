import { NextResponse } from "next/server";
import { incrementViews } from "@/lib/posts";

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  incrementViews(slug);
  return NextResponse.json({ ok: true });
}
