export type LeafOp = "eq" | "neq" | "in" | "not_in";

export type Condition =
  | { op: "all" | "any"; items: Condition[] }
  | { op: LeafOp; field: string; value: string };

export type Effect =
  | { type: "add_fit"; delta: number }
  | { type: "warning"; copyId: string }
  | {
      type: "add_curriculum";
      curriculum: string;
      delta: number;
      reasonCopyId?: string;
    }
  | {
      type: "cap_curriculum";
      curriculum: string;
      cap: number;
      reasonCopyId?: string;
      warningCopyId?: string;
    }
  | { type: "roadmap"; copyId: string };

export type Rule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  draft: boolean;
  when: Condition;
  effects: Effect[];
};

export type ScoreMap = {
  calibrated: boolean;
  scores: Record<string, number>;
};

export type DimensionPart = {
  source: string;
  weight: number;
};

export type Dimension = {
  id: string;
  label: string;
  weight: number;
  note: string;
  parts: DimensionPart[];
};

export type Band = {
  min: number;
  label: string;
  summary: string;
};

export type Curriculum = {
  id: string;
  name: string;
  base: number;
};

export type FieldOption = {
  value: string;
  label: string;
  hint?: string;
};

export type FieldDef = {
  key: string;
  title: string;
  prompt: string;
  options: FieldOption[];
};

export type DomesticEntry = {
  label: string;
  equivalent: string;
  qsBand: string;
  abroad: Record<string, string>;
};

export type AlgorithmConfig = {
  version: number;
  status: "draft" | "published";
  updatedAt: string;
  note: string;
  fields: FieldDef[];
  scoreMaps: Record<string, ScoreMap>;
  fit: {
    dimensions: Dimension[];
    bands: Band[];
  };
  curricula: Curriculum[];
  rules: Rule[];
  domesticAnchor: Record<string, DomesticEntry>;
  copy: Record<string, string>;
};

export type Profile = Record<string, string>;

export type DimensionTrace = {
  id: string;
  label: string;
  weight: number;
  score: number;
  contribution: number;
  parts: Array<{
    field: string;
    label: string;
    optionLabel: string;
    score: number;
    weight: number;
    calibrated: boolean;
  }>;
};

export type FitAdjustment = {
  ruleId: string;
  ruleName: string;
  delta: number;
  draft: boolean;
};

export type CurriculumDelta = {
  ruleId: string;
  ruleName: string;
  delta: number;
  draft: boolean;
};

export type ReasonLine = {
  text: string;
  draft: boolean;
};

export type CurriculumResult = {
  id: string;
  name: string;
  matchPercentage: number;
  reasons: ReasonLine[];
  base: number;
  uncapped: number;
  preCap: number;
  cap: number | null;
  deltas: CurriculumDelta[];
};

export type ProfileEcho = {
  key: string;
  title: string;
  optionLabel: string;
};

export type EvaluationReport = {
  configVersion: number;
  configNote: string;
  fitScore: number;
  fitRaw: number;
  fitBeforeRules: number;
  band: { label: string; summary: string };
  dimensions: DimensionTrace[];
  fitAdjustments: FitAdjustment[];
  domesticAnchor: {
    tier: string;
    tierLabel: string;
    equivalent: string;
    qsBand: string;
    abroad: string;
  };
  warnings: string[];
  curriculumRanking: CurriculumResult[];
  actionRoadmap: string[];
  hitRuleIds: string[];
  hitRules: Array<{ id: string; name: string; draft: boolean }>;
  profileEcho: ProfileEcho[];
};

export type ReportLog = {
  at: string;
  profile: Profile;
  report: EvaluationReport;
};

export function isGroup(
  condition: Condition,
): condition is { op: "all" | "any"; items: Condition[] } {
  return condition.op === "all" || condition.op === "any";
}
