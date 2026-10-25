import { NextResponse } from "next/server";
import { deny } from "../../../../lib/guard";
import {
  listVersions,
  readDraft,
  readPublished,
  recentReports,
  saveDraft,
} from "../../../../lib/config-store";
import { looksLikeConfig } from "../../../../lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const denied = deny(req);
  if (denied) return denied;
  const [draft, published, versions, recent] = await Promise.all([
    readDraft(),
    readPublished(),
    listVersions(),
    recentReports(),
  ]);
  return NextResponse.json({ draft, published, versions, recent });
}

export async function PUT(req: Request) {
  const denied = deny(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { config?: unknown } | null;
  if (!looksLikeConfig(body?.config)) {
    return NextResponse.json({ error: "配置格式不对" }, { status: 400 });
  }
  const draft = await saveDraft(body.config);
  return NextResponse.json({ draft });
}
