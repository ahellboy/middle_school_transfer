import { NextResponse } from "next/server";
import { appendReport, readPublished } from "../../../lib/config-store";
import { evaluate, profileError } from "../../../lib/engine";
import type { Profile } from "../../../lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { profile?: Profile } | null;
  const config = await readPublished();
  const profile = body?.profile ?? {};
  const error = profileError(profile, config);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const report = evaluate(profile, config);
  try {
    await appendReport({ at: new Date().toISOString(), profile, report });
  } catch {
    // The report is still returned if the local log cannot be written.
  }
  return NextResponse.json({ report });
}
