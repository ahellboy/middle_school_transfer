import { NextResponse } from "next/server";
import { isAdmin } from "./auth";

export function deny(req: Request): NextResponse | null {
  if (isAdmin(req)) return null;
  return NextResponse.json({ error: "需要登录后台" }, { status: 401 });
}
