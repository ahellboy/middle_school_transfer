import { NextResponse } from "next/server";
import { restoreVersion } from "../../../../lib/config-store";
import { deny } from "../../../../lib/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = deny(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { version?: number } | null;
  if (!body?.version || !Number.isFinite(body.version)) {
    return NextResponse.json({ error: "缺少版本号" }, { status: 400 });
  }
  try {
    const draft = await restoreVersion(body.version);
    return NextResponse.json({ draft });
  } catch {
    return NextResponse.json({ error: "没有找到这个版本" }, { status: 404 });
  }
}
