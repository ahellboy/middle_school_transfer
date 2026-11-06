import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { deny } from "../../../../lib/guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ASSETS = path.resolve(process.cwd(), "../../小程序/中学转轨/miniprogram/assets");
const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function assetFile(src: string): string | null {
  if (!src.startsWith("/assets/")) return null;
  const name = path.basename(src);
  if (name !== src.slice("/assets/".length)) return null;
  return path.join(ASSETS, name);
}

export async function GET(req: Request) {
  const denied = deny(req);
  if (denied) return denied;
  const src = new URL(req.url).searchParams.get("src") || "/assets/demo-qr.svg";
  const file = assetFile(src);
  if (!file) return NextResponse.json({ error: "找不到图片" }, { status: 404 });
  try {
    const bytes = await fs.readFile(file);
    const ext = path.extname(file).slice(1);
    const type = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": type, "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "找不到图片" }, { status: 404 });
  }
}

export async function POST(req: Request) {
  const denied = deny(req);
  if (denied) return denied;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "没有选择图片" }, { status: 400 });
  }
  const ext = TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: "只接受 PNG、JPG、WEBP 或 SVG" }, { status: 400 });
  }
  if (file.size > 500 * 1024) {
    return NextResponse.json({ error: "图片需要小于 500KB，否则小程序包会过大" }, { status: 400 });
  }
  const name = `recommend-qr.${ext}`;
  await fs.mkdir(ASSETS, { recursive: true });
  await fs.writeFile(path.join(ASSETS, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ qrSrc: `/assets/${name}` });
}
