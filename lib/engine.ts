import type {
  AlgorithmConfig,
  Condition,
  CurriculumResult,
  EvaluationReport,
  Profile,
} from "./types";
import { isGroup } from "./types";

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function matches(condition: Condition, profile: Profile): boolean {
  if (isGroup(condition)) {
    if (condition.op === "all") {
      return condition.items.every((item) => matches(item, profile));
    }
    return condition.items.some((item) => matches(item, profile));
  }
  const actual = profile[condition.field] ?? "";
  if (condition.op === "eq") return actual === condition.value;
  if (condition.op === "neq") return actual !== condition.value;
  const list = condition.value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (condition.op === "in") return list.includes(actual);
  return !list.includes(actual);
}

function fieldsIn(condition: Condition): string[] {
  if (isGroup(condition)) return condition.items.flatMap(fieldsIn);
  return [condition.field];
}

export type DoorPreview = {
  id: string;
  name: string;
  score: number;
  cap: number | null;
  moves: Array<{ ruleId: string; ruleName: string; delta: number }>;
};

export function previewDoors(profile: Profile, config: AlgorithmConfig): DoorPreview[] {
  const buckets = new Map<string, DoorPreview>();
  for (const curriculum of config.curricula) {
    buckets.set(curriculum.id, {
      id: curriculum.id,
      name: curriculum.name,
      score: curriculum.base,
      cap: null,
      moves: [],
    });
  }
  for (const rule of config.rules) {
    if (!rule.enabled) continue;
    if (fieldsIn(rule.when).some((field) => !profile[field])) continue;
    if (!matches(rule.when, profile)) continue;
    for (const effect of rule.effects) {
      if (effect.type === "add_curriculum") {
        const door = buckets.get(effect.curriculum);
        if (!door) continue;
        door.moves.push({ ruleId: rule.id, ruleName: rule.name, delta: effect.delta });
      } else if (effect.type === "cap_curriculum") {
        const door = buckets.get(effect.curriculum);
        if (!door) continue;
        door.cap = door.cap === null ? effect.cap : Math.min(door.cap, effect.cap);
        door.moves.push({ ruleId: rule.id, ruleName: rule.name, delta: 0 });
      }
    }
  }
  for (const curriculum of config.curricula) {
    const door = buckets.get(curriculum.id);
    if (!door) continue;
    const uncapped = clamp(
      round2(curriculum.base + door.moves.reduce((sum, move) => sum + move.delta, 0)),
      0,
      100,
    );
    const capped = door.cap === null ? uncapped : Math.min(uncapped, door.cap);
    door.score = Math.round(clamp(capped, 0, 100));
  }
  return config.curricula.map((curriculum) => buckets.get(curriculum.id)!);
}

function fieldTitle(config: AlgorithmConfig, key: string): string {
  return config.fields.find((field) => field.key === key)?.title ?? key;
}

function optionLabel(config: AlgorithmConfig, key: string, value: string): string {
  const option = config.fields
    .find((field) => field.key === key)
    ?.options.find((item) => item.value === value);
  return option?.label ?? (value || "未填");
}

function fieldScore(config: AlgorithmConfig, key: string, value: string): number {
  const score = config.scoreMaps[key]?.scores[value];
  return typeof score === "number" && Number.isFinite(score) ? score : 0;
}

export function profileError(profile: Profile, config: AlgorithmConfig): string | null {
  if (!profile || typeof profile !== "object") return "缺少学生画像";
  for (const field of config.fields) {
    const value = profile[field.key];
    if (!value) return `还没有填写「${field.title}」`;
    if (!field.options.some((option) => option.value === value)) {
      return `「${field.title}」的选项不在配置里`;
    }
  }
  return null;
}

function fallbackReason(
  deltas: CurriculumResult["deltas"],
): CurriculumResult["reasons"] {
  const ranked = deltas
    .map((delta, index) => ({ delta, index }))
    .sort(
      (a, b) =>
        Math.abs(b.delta.delta) - Math.abs(a.delta.delta) || a.index - b.index,
    )
    .slice(0, 2)
    .map((item) => item.delta);
  if (ranked.length === 0) {
    return [{ text: "没有命中额外规则，分数就是起算分。", draft: false }];
  }
  const text = `影响最大的是${ranked
    .map((delta) => `「${delta.ruleName}」${delta.delta > 0 ? "+" : ""}${delta.delta}`)
    .join("、")}。`;
  return [{ text, draft: false }];
}

export function evaluate(profile: Profile, config: AlgorithmConfig): EvaluationReport {
  const dimensions = config.fit.dimensions.map((dimension) => {
    const weightSum = dimension.parts.reduce((sum, part) => sum + part.weight, 0) || 1;
    const parts = dimension.parts.map((part) => {
      const value = profile[part.source] ?? "";
      return {
        field: part.source,
        label: fieldTitle(config, part.source),
        optionLabel: optionLabel(config, part.source, value),
        score: fieldScore(config, part.source, value),
        weight: part.weight / weightSum,
        calibrated: config.scoreMaps[part.source]?.calibrated ?? false,
      };
    });
    const score = round2(
      parts.reduce((sum, part) => sum + part.score * part.weight, 0),
    );
    return {
      id: dimension.id,
      label: dimension.label,
      weight: dimension.weight,
      score,
      contribution: round2(score * dimension.weight),
      parts,
    };
  });

  let fitBeforeRules = round2(
    dimensions.reduce((sum, dimension) => sum + dimension.contribution, 0),
  );
  const fitAdjustments: EvaluationReport["fitAdjustments"] = [];
  const warnings: string[] = [];
  const roadmap: string[] = [];
  const hitRuleIds: string[] = [];
  const hitRules: EvaluationReport["hitRules"] = [];
  const buckets = new Map<
    string,
    { deltas: CurriculumResult["deltas"]; cap: number | null; reasons: CurriculumResult["reasons"] }
  >();
  for (const curriculum of config.curricula) {
    buckets.set(curriculum.id, { deltas: [], cap: null, reasons: [] });
  }

  const pushWarning = (copyId: string | undefined) => {
    if (!copyId) return;
    const text = config.copy[copyId];
    if (!text || warnings.includes(text)) return;
    warnings.push(text);
  };
  const pushRoadmap = (copyId: string) => {
    const text = config.copy[copyId];
    if (!text || roadmap.includes(text)) return;
    roadmap.push(text);
  };
  const pushReason = (
    reasons: CurriculumResult["reasons"],
    copyId: string | undefined,
    draft: boolean,
  ) => {
    if (!copyId) return;
    const text = config.copy[copyId];
    if (!text) return;
    const existing = reasons.find((reason) => reason.text === text);
    if (existing) {
      if (!draft) existing.draft = false;
      return;
    }
    reasons.push({ text, draft });
  };

  for (const rule of config.rules) {
    if (!rule.enabled || !matches(rule.when, profile)) continue;
    hitRuleIds.push(rule.id);
    hitRules.push({ id: rule.id, name: rule.name, draft: rule.draft });
    for (const effect of rule.effects) {
      if (effect.type === "add_fit") {
        fitAdjustments.push({
          ruleId: rule.id,
          ruleName: rule.name,
          delta: effect.delta,
          draft: rule.draft,
        });
      } else if (effect.type === "warning") {
        pushWarning(effect.copyId);
      } else if (effect.type === "roadmap") {
        pushRoadmap(effect.copyId);
      } else if (effect.type === "add_curriculum") {
        const bucket = buckets.get(effect.curriculum);
        if (!bucket) continue;
        bucket.deltas.push({
          ruleId: rule.id,
          ruleName: rule.name,
          delta: effect.delta,
          draft: rule.draft,
        });
        pushReason(bucket.reasons, effect.reasonCopyId, rule.draft);
      } else if (effect.type === "cap_curriculum") {
        const bucket = buckets.get(effect.curriculum);
        if (!bucket) continue;
        bucket.cap = bucket.cap === null ? effect.cap : Math.min(bucket.cap, effect.cap);
        pushReason(bucket.reasons, effect.reasonCopyId, rule.draft);
        pushWarning(effect.warningCopyId);
      }
    }
  }

  let fitRaw = fitBeforeRules;
  for (const adjustment of fitAdjustments) {
    fitRaw = round2(fitRaw + adjustment.delta);
  }
  fitRaw = clamp(fitRaw, 0, 100);
  const fitScore = Math.round(fitRaw);
  const band =
    [...config.fit.bands]
      .sort((a, b) => b.min - a.min)
      .find((item) => fitScore >= item.min) ?? {
      label: "无法分档",
      summary: "配置里没有覆盖这个分数的分档。",
    };

  const ranking = config.curricula.map((curriculum) => {
    const bucket = buckets.get(curriculum.id) ?? {
      deltas: [],
      cap: null,
      reasons: [],
    };
    const uncapped = round2(
      curriculum.base + bucket.deltas.reduce((sum, delta) => sum + delta.delta, 0),
    );
    const preCap = clamp(uncapped, 0, 100);
    const capped = bucket.cap === null ? preCap : Math.min(preCap, bucket.cap);
    const matchPercentage = Math.round(clamp(capped, 0, 100));
    return {
      id: curriculum.id,
      name: curriculum.name,
      matchPercentage,
      reasons: bucket.reasons.length > 0 ? bucket.reasons : fallbackReason(bucket.deltas),
      base: curriculum.base,
      uncapped,
      preCap,
      cap: bucket.cap,
      deltas: bucket.deltas,
    };
  });
  ranking.sort((a, b) => b.matchPercentage - a.matchPercentage);

  const tier = profile.shanghai_rank_tier ?? "";
  const country = profile.target_country ?? "";
  const anchor = config.domesticAnchor[tier];

  return {
    configVersion: config.version,
    configNote: config.note,
    fitScore,
    fitRaw,
    fitBeforeRules,
    band: { label: band.label, summary: band.summary },
    dimensions,
    fitAdjustments,
    domesticAnchor: {
      tier,
      tierLabel: anchor?.label ?? optionLabel(config, "shanghai_rank_tier", tier),
      equivalent: anchor?.equivalent ?? "配置里没有这一档的体制内对照。",
      qsBand: anchor?.qsBand ?? "",
      abroad: anchor?.abroad?.[country] ?? "",
    },
    warnings,
    curriculumRanking: ranking,
    actionRoadmap: roadmap,
    hitRuleIds,
    hitRules,
    profileEcho: config.fields.map((field) => ({
      key: field.key,
      title: field.title,
      optionLabel: optionLabel(config, field.key, profile[field.key] ?? ""),
    })),
  };
}
