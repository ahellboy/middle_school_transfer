import { NextResponse } from "next/server";
import { resetDraft } from "../../../../lib/config-store";
import { deny } from "../../../../lib/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = deny(req);
  if (denied) return denied;
  const draft = await resetDraft();
  return NextResponse.json({ draft });
}
