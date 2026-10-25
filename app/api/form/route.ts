import { NextResponse } from "next/server";
import { readPublished } from "../../../lib/config-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const config = await readPublished();
  return NextResponse.json({ version: config.version, fields: config.fields, config });
}
