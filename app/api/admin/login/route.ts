import { NextResponse } from "next/server";
import { SESSION_COOKIE, passwordOk, sessionToken } from "../../../../lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  if (!body?.password || !passwordOk(body.password)) {
    return NextResponse.json({ error: "口令不对" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
