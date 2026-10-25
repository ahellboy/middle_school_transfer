import type { AlgorithmConfig, Condition, Effect } from "./types";
import { isGroup } from "./types";

export function looksLikeConfig(value: unknown): value is AlgorithmConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as AlgorithmConfig;
  return (
    Array.isArray(config.fields) &&
    Array.isArray(config.rules) &&
    Array.isArray(config.curricula) &&
    typeof config.copy === "object" &&
    config.copy !== null &&
    typeof config.fit === "object" &&
    config.fit !== null &&
    typeof config.scoreMaps === "object" &&
    typeof config.domesticAnchor === "object"
  );
}

function walk(condition: Condition, visit: (leaf: Exclude<Condition, { op: "all" | "any" }>) => void) {
  if (isGroup(condition)) {
    for (const item of condition.items) walk(item, visit);
    return;
  }
  visit(condition);
}

function effectCopyIds(effect: Effect): string[] {
  if (effect.type === "warning" || effect.type === "roadmap") return [effect.copyId];
  if (effect.type === "add_curriculum") return effect.reasonCopyId ? [effect.reasonCopyId] : [];
  if (effect.type === "cap_curriculum") {
    return [effect.reasonCopyId, effect.warningCopyId].filter((id): id is string => Boolean(id));
  }
  return [];
}

export function validateConfig(config: AlgorithmConfig): string[] {
  const errors: string[] = [];
  const fieldKeys = new Set<string>();
  if (!Array.isArray(config.fields) || config.fields.length === 0) {
    errors.push("至少需要一道题目");
  }
  for (const field of config.fields ?? []) {
    if (!field.key || !field.title || !field.prompt) {
      errors.push("每一道题都要有代码、短标题和题干");
    }
    if (fieldKeys.has(field.key)) errors.push(`题目代码重复：${field.key}`);
    fieldKeys.add(field.key);
    const values = new Set<string>();
    if (!field.options?.length) errors.push(`「${field.title || field.key}」没有选项`);
    for (const option of field.options ?? []) {
      if (!option.value || !option.label) {
        errors.push(`「${field.title || field.key}」有空的选项代码或文案`);
      }
      if (values.has(option.value)) errors.push(`「${field.title}」的选项代码重复：${option.value}`);
      values.add(option.value);
    }
  }

  const weightSum = (config.fit?.dimensions ?? []).reduce((sum, dimension) => sum + dimension.weight, 0);
  if (Math.abs(weightSum - 1) > 0.001) {
    errors.push(`适合度权重合计为 ${weightSum.toFixed(3)}，需要等于 1`);
  }
  const dimensionIds = new Set<string>();
  for (const dimension of config.fit?.dimensions ?? []) {
    if (!dimension.label) errors.push("适合度维度缺少名称");
    if (dimensionIds.has(dimension.id)) errors.push(`维度代码重复：${dimension.id}`);
    dimensionIds.add(dimension.id);
    if (!dimension.parts?.length) errors.push(`「${dimension.label}」至少要有一个计分项`);
    const sources = new Set<string>();
    for (const part of dimension.parts ?? []) {
      if (!(part.weight > 0)) errors.push(`「${dimension.label}」的内部权重需要大于 0`);
      if (!fieldKeys.has(part.source)) errors.push(`「${dimension.label}」引用了不存在的题目 ${part.source}`);
      if (sources.has(part.source)) errors.push(`「${dimension.label}」重复使用了 ${part.source}`);
      sources.add(part.source);
      const map = config.scoreMaps?.[part.source];
      const field = config.fields.find((item) => item.key === part.source);
      if (!map) {
        errors.push(`「${dimension.label}」使用的「${field?.title ?? part.source}」还没有分值表`);
        continue;
      }
      for (const option of field?.options ?? []) {
        const score = map.scores?.[option.value];
        if (typeof score !== "number" || !Number.isFinite(score)) {
          errors.push(`「${field?.title ?? part.source}」的选项 ${option.value} 没有分值`);
        } else if (score < 0 || score > 100) {
          errors.push(`「${field?.title ?? part.source}」的分值需要在 0 到 100 之间`);
        }
      }
    }
  }

  for (const key of Object.keys(config.scoreMaps ?? {})) {
    if (!fieldKeys.has(key)) errors.push(`分值表有未知题目：${key}`);
  }

  const bands = config.fit?.bands ?? [];
  if (!bands.some((band) => band.min === 0)) errors.push("分档里需要有一档从 0 分开始");
  const seenMin = new Set<number>();
  for (const band of bands) {
    if (!band.label || !band.summary) errors.push("每个分档都要有名称和说明");
    if (band.min < 0 || band.min > 100) errors.push("分档起点需要在 0 到 100 之间");
    if (seenMin.has(band.min)) errors.push(`分档起点重复：${band.min}`);
    seenMin.add(band.min);
  }

  if (!config.curricula?.length) errors.push("至少需要一条课程体系");
  const curriculumIds = new Set<string>();
  for (const curriculum of config.curricula ?? []) {
    if (!curriculum.id || !curriculum.name) errors.push("课程体系需要代码和名称");
    if (curriculumIds.has(curriculum.id)) errors.push(`体系代码重复：${curriculum.id}`);
    curriculumIds.add(curriculum.id);
    if (curriculum.base < 0 || curriculum.base > 100) errors.push(`${curriculum.name} 的起算分需要在 0 到 100 之间`);
  }

  const ruleIds = new Set<string>();
  for (const rule of config.rules ?? []) {
    if (!rule.id || !rule.name) errors.push("规则需要编号和名称");
    if (ruleIds.has(rule.id)) errors.push(`规则编号重复：${rule.id}`);
    ruleIds.add(rule.id);
    if (!rule.effects?.length) errors.push(`规则「${rule.name}」没有任何效果`);
    walk(rule.when, (leaf) => {
      if (!fieldKeys.has(leaf.field)) errors.push(`规则「${rule.name}」使用了不存在的题目 ${leaf.field}`);
    });
    for (const effect of rule.effects ?? []) {
      if (effect.type === "add_fit" && !Number.isFinite(effect.delta)) {
        errors.push(`规则「${rule.name}」的适合度加减分不是数字`);
      }
      if (effect.type === "add_curriculum") {
        if (!curriculumIds.has(effect.curriculum)) {
          errors.push(`规则「${rule.name}」指向了不存在的体系 ${effect.curriculum}`);
        }
        if (!Number.isFinite(effect.delta)) errors.push(`规则「${rule.name}」的体系加减分不是数字`);
      }
      if (effect.type === "cap_curriculum") {
        if (!curriculumIds.has(effect.curriculum)) {
          errors.push(`规则「${rule.name}」封顶指向了不存在的体系`);
        }
        if (effect.cap < 0 || effect.cap > 100) errors.push(`规则「${rule.name}」的封顶需要在 0 到 100 之间`);
      }
      for (const copyId of effectCopyIds(effect)) {
        if (!config.copy?.[copyId]?.trim()) errors.push(`规则「${rule.name}」引用的文案不存在：${copyId}`);
      }
    }
  }

  const rank = config.fields?.find((field) => field.key === "shanghai_rank_tier");
  const countries = config.fields?.find((field) => field.key === "target_country");
  for (const option of rank?.options ?? []) {
    const entry = config.domesticAnchor?.[option.value];
    if (!entry?.equivalent?.trim()) {
      errors.push(`体制内对照缺少「${option.label}」的说明`);
    }
    if (!entry?.qsBand?.trim()) {
      errors.push(`体制内对照缺少「${option.label}」的国际档次`);
    }
    for (const country of countries?.options ?? []) {
      if (!entry?.abroad?.[country.value]?.trim()) {
        errors.push(`体制内对照缺少「${option.label}」在「${country.label}」的国际举例`);
      }
    }
  }

  return errors;
}
