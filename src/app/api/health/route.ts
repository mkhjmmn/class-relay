import { NextResponse } from "next/server";
import { aiMode } from "@/ai/provider";

export const dynamic = "force-dynamic";

export function GET() {
  const dataMode = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "supabase" : "sandbox";
  return NextResponse.json({ ok: true, dataMode, aiMode: aiMode(), time: new Date().toISOString() });
}
