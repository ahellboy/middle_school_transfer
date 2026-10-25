import { signedScore } from "../../lib/format";
import type { AlgorithmConfig, Rule } from "../../lib/types";
import { isGroup } from "../../lib/types";

export function summarizeWhen(rule: Rule, config: AlgorithmConfig): string {
  if (!isGroup(rule.when)) return "含有嵌套条件";
  if (rule.when.items.length === 0) return "所有学生";
  const joiner = rule.when.op === "all" ? " 且 " : " 或 ";
  return rule.when.items
    .map((item) => {
      if (isGroup(item)) return "（嵌套）";
      const field = config.fields.find((entry) => entry.key === item.field);
      const option = field?.options.find((entry) => entry.value === item.value);
      const op = item.op === "eq" ? "=" : item.op === "neq" ? "≠" : item.op;
      return `${field?.title ?? item.field} ${op} ${option?.label ?? item.value}`;
    })
    .join(joiner);
}

export function summarizeEffects(rule: Rule, config: AlgorithmConfig): string {
  return rule.effects
    .map((effect) => {
      if (effect.type === "add_fit") return `适合度 ${signedScore(effect.delta)}`;
      if (effect.type === "warning") return "警示";
      if (effect.type === "roadmap") return "路线图";
      const name = config.curricula.find((item) => item.id === effect.curriculum)?.name ?? effect.curriculum;
      if (effect.type === "add_curriculum") return `${name} ${signedScore(effect.delta)}`;
      return `${name} 封顶 ${effect.cap}`;
    })
    .join(" · ");
}

export function affectsScore(rule: Rule): boolean {
  return rule.effects.some(
    (effect) => effect.type === "add_fit" || effect.type === "add_curriculum" || effect.type === "cap_curriculum",
  );
}
