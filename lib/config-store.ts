import { promises as fs } from "fs";
import path from "path";
import { createDefaultConfig } from "./default-config";
import type { AlgorithmConfig, ReportLog } from "./types";

const DIR = path.join(process.cwd(), "data", "algorithm");
const PUBLISHED = path.join(DIR, "published.json");
const DRAFT = path.join(DIR, "draft.json");
const VERSIONS = path.join(DIR, "versions");
const REPORTS = path.join(DIR, "reports.jsonl");

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function readConfig(file: string): Promise<AlgorithmConfig> {
  return JSON.parse(await fs.readFile(file, "utf8")) as AlgorithmConfig;
}

export async function ensureStore(): Promise<void> {
  await fs.mkdir(VERSIONS, { recursive: true });
  if (!(await exists(PUBLISHED))) {
    const config = createDefaultConfig();
    config.status = "published";
    config.version = 1;
    config.updatedAt = new Date().toISOString();
    const text = JSON.stringify(config, null, 2);
    await fs.writeFile(PUBLISHED, text);
    await fs.writeFile(path.join(VERSIONS, "v1.json"), text);
  }
  if (!(await exists(DRAFT))) {
    const published = await readConfig(PUBLISHED);
    published.status = "draft";
    await fs.writeFile(DRAFT, JSON.stringify(published, null, 2));
  }
}

export async function readPublished(): Promise<AlgorithmConfig> {
  await ensureStore();
  return readConfig(PUBLISHED);
}

export async function readDraft(): Promise<AlgorithmConfig> {
  await ensureStore();
  return readConfig(DRAFT);
}

export async function listVersions(): Promise<Array<{ version: number; updatedAt: string }>> {
  await ensureStore();
  const files = await fs.readdir(VERSIONS);
  const versions: Array<{ version: number; updatedAt: string }> = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const config = await readConfig(path.join(VERSIONS, file));
      versions.push({ version: config.version, updatedAt: config.updatedAt });
    } catch {
      continue;
    }
  }
  return versions.sort((a, b) => b.version - a.version);
}

export async function saveDraft(config: AlgorithmConfig): Promise<AlgorithmConfig> {
  await ensureStore();
  const published = await readPublished();
  const draft: AlgorithmConfig = {
    ...config,
    status: "draft",
    version: published.version,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(DRAFT, JSON.stringify(draft, null, 2));
  return draft;
}

export async function publishConfig(
  config: AlgorithmConfig,
): Promise<{ errors?: string[]; draft?: AlgorithmConfig; published?: AlgorithmConfig }> {
  const { validateConfig } = await import("./validate");
  const errors = validateConfig(config);
  if (errors.length > 0) return { errors };
  await ensureStore();
  const published = await readPublished();
  const versions = await listVersions();
  const nextVersion =
    Math.max(published.version, ...versions.map((item) => item.version), 0) + 1;
  const stamped: AlgorithmConfig = {
    ...config,
    version: nextVersion,
    status: "published",
    updatedAt: new Date().toISOString(),
  };
  const text = JSON.stringify(stamped, null, 2);
  await fs.writeFile(path.join(VERSIONS, `v${nextVersion}.json`), text);
  await fs.writeFile(PUBLISHED, text);
  const draft: AlgorithmConfig = { ...structuredClone(stamped), status: "draft" };
  await fs.writeFile(DRAFT, JSON.stringify(draft, null, 2));
  return { draft, published: stamped };
}

export async function restoreVersion(version: number): Promise<AlgorithmConfig> {
  await ensureStore();
  const archived = await readConfig(path.join(VERSIONS, `v${version}.json`));
  return saveDraft(archived);
}

export async function resetDraft(): Promise<AlgorithmConfig> {
  return saveDraft(createDefaultConfig());
}

export async function appendReport(entry: ReportLog): Promise<void> {
  await ensureStore();
  await fs.appendFile(REPORTS, `${JSON.stringify(entry)}\n`, "utf8");
}

export async function recentReports(limit = 8): Promise<ReportLog[]> {
  await ensureStore();
  if (!(await exists(REPORTS))) return [];
  const raw = await fs.readFile(REPORTS, "utf8");
  const rows: ReportLog[] = [];
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      rows.push(JSON.parse(line) as ReportLog);
    } catch {
      continue;
    }
  }
  return rows.slice(-limit).reverse();
}
