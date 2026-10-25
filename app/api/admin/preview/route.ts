import { NextResponse } from "next/server";
import { readPublished } from "../../../../lib/config-store";
import { evaluate, profileError } from "../../../../lib/engine";
import { deny } from "../../../../lib/guard";
import type { Profile } from "../../../../lib/types";
import { looksLikeConfig, validateConfig } from "../../../../lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = deny(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as {
    config?: unknown;
    profiles?: Profile[];
  } | null;
  const config = body?.config;
  if (!looksLikeConfig(config)) {
    return NextResponse.json({ error: "配置格式不对" }, { status: 400 });
  }
  const published = await readPublished();
  const profiles = Array.isArray(body?.profiles) ? body.profiles : [];
  const results = profiles.map((profile) => {
    const draftError = profileError(profile, config);
    const publishedError = profileError(profile, published);
    return {
      draft: draftError ? null : evaluate(profile, config),
      published: publishedError ? null : evaluate(profile, published),
      draftError,
      publishedError,
    };
  });
  return NextResponse.json({ validation: validateConfig(config), results });
}
