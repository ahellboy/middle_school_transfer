import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDefaultConfig } from "../lib/default-config";
import { evaluate, previewDoors } from "../lib/engine";
import { fixtures } from "../lib/fixtures";
import { validateConfig } from "../lib/validate";

const stem = fixtures[0].profile;
const allround = fixtures[1].profile;
const budget = fixtures[2].profile;

describe("default config", () => {
  it("passes validation and covers every fixture answer", () => {
    const config = createDefaultConfig();
    assert.deepEqual(validateConfig(config), []);
    for (const fixture of fixtures) {
      for (const field of config.fields) {
        assert.ok(
          field.options.some((option) => option.value === fixture.profile[field.key]),
          `${fixture.id} missing ${field.key}`,
        );
      }
    }
  });

  it("rejects weights that do not sum to 1 and missing copy", () => {
    const broken = createDefaultConfig();
    broken.fit.dimensions[0].weight = 0.5;
    assert.ok(validateConfig(broken).some((error) => error.includes("权重")));

    const missing = createDefaultConfig();
    delete missing.copy.budget_limited;
    assert.ok(validateConfig(missing).some((error) => error.includes("budget_limited")));
  });
});

describe("evaluate", () => {
  it("ranks A-Level first for a STEM student with mid English", () => {
    const report = evaluate(stem, createDefaultConfig());
    assert.equal(report.fitRaw, 81.05);
    assert.equal(report.fitScore, 81);
    assert.equal(report.band.label, "可以准备转轨");
    assert.deepEqual(
      report.curriculumRanking.map((item) => [item.name, item.matchPercentage]),
      [
        ["A-Level", 88],
        ["AP", 64],
        ["IB", 56],
      ],
    );
    assert.equal(report.warnings.length, 1);
    assert.match(report.warnings[0], /论文/);
    assert.equal(report.domesticAnchor.tier, "T2");
    assert.match(report.domesticAnchor.equivalent, /同济大学/);
    assert.match(report.domesticAnchor.equivalent, /不是录取预测/);
    assert.match(report.domesticAnchor.qsBand, /前 30/);
    assert.match(report.domesticAnchor.abroad, /香港大学/);
    const sameRankUs = evaluate({ ...stem, target_country: "US" }, createDefaultConfig());
    assert.match(sameRankUs.domesticAnchor.equivalent, /同济大学/);
    assert.match(sameRankUs.domesticAnchor.abroad, /伯克利/);
    assert.equal(report.actionRoadmap.length, 3);
    assert.match(report.actionRoadmap[0], /托福/);
    assert.match(report.actionRoadmap[2], /学籍/);
    assert.match(report.curriculumRanking[0].reasons[0].text, /数理优势/);
    assert.match(report.curriculumRanking[1].reasons[0].text, /数理强，AP 略加/);
  });

  it("puts IB and AP ahead of A-Level for a balanced US-bound student", () => {
    const report = evaluate(allround, createDefaultConfig());
    assert.equal(report.fitScore, 100);
    assert.equal(report.warnings.length, 0);
    assert.equal(report.curriculumRanking[0].name, "IB");
    assert.equal(report.curriculumRanking[0].matchPercentage, 100);
    assert.equal(report.curriculumRanking[1].name, "AP");
    assert.equal(report.curriculumRanking[1].matchPercentage, 97);
    assert.equal(report.curriculumRanking[2].matchPercentage, 66);
    assert.match(report.curriculumRanking[0].reasons.map((reason) => reason.text).join(""), /论文/);
    assert.match(report.domesticAnchor.equivalent, /顶尖 985/);
    assert.match(report.domesticAnchor.equivalent, /复旦大学/);
    assert.match(report.domesticAnchor.abroad, /麻省理工学院/);
  });

  it("warns and lowers the score when budget and English are both weak", () => {
    const report = evaluate(budget, createDefaultConfig());
    assert.equal(report.fitBeforeRules, 41.1);
    assert.equal(report.fitRaw, 26.1);
    assert.equal(report.fitScore, 26);
    assert.equal(report.band.label, "暂不建议直接入读");
    assert.match(report.warnings[0], /预算受限/);
    assert.match(report.warnings[1], /半到一年/);
    assert.match(report.warnings[2], /论文/);
    assert.deepEqual(
      report.curriculumRanking.map((item) => item.matchPercentage),
      [32, 28, 22],
    );
    assert.match(report.domesticAnchor.equivalent, /杉达/);
    assert.match(report.domesticAnchor.qsBand, /前 100/);
    assert.match(report.domesticAnchor.abroad, /格拉斯哥大学/);
    assert.ok(report.actionRoadmap.some((item) => item.includes("衔接")));
    assert.ok(report.actionRoadmap.every((item) => !item.includes("学籍")));
  });

  it("does not add a second penalty when budget is low", () => {
    const report = evaluate({ ...stem, budget_tier: "B1_LOW" }, createDefaultConfig());
    assert.equal(report.fitRaw, 75.05);
    assert.equal(report.fitScore, 75);
    assert.equal(report.band.label, "有条件适合");
    assert.ok(report.warnings.some((warning) => warning.includes("预算受限")));
    assert.equal(report.curriculumRanking[0].matchPercentage, 88);
  });

  it("reads enabled rules and weights from the config object", () => {
    const withoutStem = createDefaultConfig();
    const stemRule = withoutStem.rules.find((rule) => rule.id === "alevel_stem");
    assert.ok(stemRule);
    stemRule.enabled = false;
    assert.equal(evaluate(stem, withoutStem).curriculumRanking[0].matchPercentage, 68);

    const academicOnly = createDefaultConfig();
    academicOnly.fit.dimensions[0].weight = 1;
    for (const dimension of academicOnly.fit.dimensions.slice(1)) dimension.weight = 0;
    assert.equal(evaluate(stem, academicOnly).fitScore, 70);

    const boosted = createDefaultConfig();
    boosted.rules.push({
      id: "boost",
      name: "临时加分",
      description: "",
      enabled: true,
      draft: true,
      when: { op: "all", items: [] },
      effects: [{ type: "add_curriculum", curriculum: "A-Level", delta: 80 }],
    });
    const alevel = evaluate(stem, boosted).curriculumRanking.find((item) => item.id === "A-Level");
    assert.equal(alevel?.matchPercentage, 100);
    assert.equal(alevel?.uncapped, 168);
  });
});

describe("previewDoors", () => {
  it("moves a door only after the fields that rule needs are answered", () => {
    const config = createDefaultConfig();
    assert.deepEqual(
      previewDoors({}, config).map((door) => door.score),
      [50, 50, 50],
    );

    const stemOnly = previewDoors({ subject_strength: "STEM_STRONG" }, config);
    assert.equal(stemOnly.find((door) => door.id === "A-Level")?.score, 70);
    assert.equal(stemOnly.find((door) => door.id === "AP")?.score, 56);
    assert.equal(stemOnly.find((door) => door.id === "IB")?.score, 42);
    assert.equal(stemOnly.find((door) => door.id === "IB")?.cap, null);

    const englishOnly = previewDoors({ english_level: "C" }, config);
    assert.equal(englishOnly.find((door) => door.id === "IB")?.cap, null);

    const barred = previewDoors({ english_level: "B", mindset_exploration: "B" }, config);
    assert.equal(barred.find((door) => door.id === "IB")?.cap, 65);

    const open = previewDoors({ english_level: "A", mindset_exploration: "A" }, config);
    assert.equal(open.find((door) => door.id === "IB")?.cap, null);
    assert.equal(open.find((door) => door.id === "IB")?.score, 86);
  });
});
