"use client";

import { useState } from "react";
import { evaluate } from "../../lib/engine";
import type { AlgorithmConfig, EvaluationReport, FieldDef, Profile } from "../../lib/types";
import { Bear } from "./props";
import { SoundToggle, roomSound } from "./sound";

const leverKeys = ["english_level", "mindset_exploration", "target_country", "budget_tier"];

function shiftText(official: EvaluationReport, next: EvaluationReport): string {
  const before = new Set(official.hitRuleIds);
  const after = new Set(next.hitRules.map((rule) => rule.id));
  const added = next.hitRules.filter((rule) => !before.has(rule.id)).map((rule) => rule.name);
  const removed = official.hitRules.filter((rule) => !after.has(rule.id)).map((rule) => rule.name);
  const scores = official.curriculumRanking
    .map((item) => {
      const now = next.curriculumRanking.find((curriculum) => curriculum.id === item.id);
      if (!now || now.matchPercentage === item.matchPercentage) return "";
      return `${item.name} ${item.matchPercentage} → ${now.matchPercentage}`;
    })
    .filter(Boolean);
  const parts: string[] = [];
  if (next.fitScore !== official.fitScore) parts.push(`适合度 ${official.fitScore} → ${next.fitScore}`);
  if (scores.length > 0) parts.push(scores.join("，"));
  if (added.length > 0) parts.push(`新碰上：${added.slice(0, 3).join("、")}`);
  if (removed.length > 0) parts.push(`不再碰上：${removed.slice(0, 3).join("、")}`);
  return parts.join("。");
}

export function ResultMap({
  config,
  fields,
  official,
  answers,
  parentReport,
  parentAnswers,
  onRestart,
}: {
  config: AlgorithmConfig;
  fields: FieldDef[];
  official: EvaluationReport;
  answers: Profile;
  parentReport: EvaluationReport | null;
  parentAnswers: Profile | null;
  onRestart: () => void;
}) {
  const [view, setView] = useState<"student" | "parent">("student");
  const [overrides, setOverrides] = useState<Profile>({});

  const baseAnswers = view === "parent" && parentAnswers ? parentAnswers : answers;
  const baseReport = view === "parent" && parentReport ? parentReport : official;
  const shifted = Object.keys(overrides).length > 0;
  const live = shifted ? evaluate({ ...baseAnswers, ...overrides }, config) : baseReport;
  const levers = fields.filter((field) => leverKeys.includes(field.key));
  const divergences =
    parentAnswers === null
      ? []
      : fields.filter((field) => answers[field.key] && parentAnswers[field.key] && answers[field.key] !== parentAnswers[field.key]);

  function choose(field: FieldDef, value: string) {
    roomSound().button();
    setOverrides((current) => {
      const next = { ...current };
      if (value === baseAnswers[field.key]) delete next[field.key];
      else next[field.key] = value;
      return next;
    });
  }

  const systems = config.curricula.map((curriculum) => {
    const match = live.curriculumRanking.find((item) => item.id === curriculum.id);
    return {
      id: curriculum.id,
      name: curriculum.name,
      score: match?.matchPercentage ?? curriculum.base,
      capped: match?.cap !== null && match?.cap !== undefined,
    };
  });
  const topScore = Math.max(...systems.map((item) => item.score));
  const leaders = systems.filter((item) => item.score === topScore);
  const leadId = leaders.length === 1 ? leaders[0].id : null;

  return (
    <main className="room">
      <SoundToggle />
      <section className="room-scene result-scene">
        <Bear />
        <article className="bubble result-card">
          <p className="bubble-kicker">{shifted ? "改过答案后的读数" : "转轨适合度"} · v{official.configVersion}</p>
          <div className="fit-head">
            <p className="fit-num">{live.fitScore}</p>
            <span className="band-pill">{live.band.label}</span>
          </div>
          <p className="result-summary">{live.band.summary}</p>
          {shifted ? <p className="bubble-note">正式填写仍是 {baseReport.fitScore}。这里的改动不改已经记下的结果。</p> : null}
          <div className="sys-list">
            <p className="sys-title">三种体系</p>
            {systems.map((item) => (
              <div className="sys-row" key={item.id}>
                <span className="sys-name">{item.name}</span>
                <span className="sys-track">
                  <span className={item.id === leadId ? "is-lead" : ""} style={{ width: `${item.score}%` }} />
                  {item.capped ? <em>门槛压低</em> : null}
                </span>
                <b>{item.score}</b>
              </div>
            ))}
          </div>
          {shifted && shiftText(baseReport, live) ? <p className="bubble-note">{shiftText(baseReport, live)}</p> : null}
          <p className="result-foot">这是路径对照，不是录取预测。</p>
        </article>
      </section>

      <div className="room-extra stack">
      {parentReport && parentAnswers ? (
        <div className="inline-actions no-print">
          <button className={`btn ${view === "student" ? "btn-primary" : "btn-ghost"}`} type="button" onClick={() => { roomSound().button(); setView("student"); setOverrides({}); }}>
            学生的结果
          </button>
          <button className={`btn ${view === "parent" ? "btn-primary" : "btn-ghost"}`} type="button" onClick={() => { roomSound().button(); setView("parent"); setOverrides({}); }}>
            家长的结果
          </button>
        </div>
      ) : null}

      {divergences.length > 0 ? (
        <section className="card">
          <p className="kicker">分歧卡</p>
          <h2>学生和家长答得不一样</h2>
          <ul className="reasons">
            {divergences.map((field) => (
              <li key={field.key}>
                {field.title}：学生选「{field.options.find((option) => option.value === answers[field.key])?.label}」，家长选「{field.options.find((option) => option.value === parentAnswers?.[field.key])?.label}」。
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {live.warnings.length > 0 ? (
        <section className="card roadblocks">
          <h3>需要先看的提醒</h3>
          <ul className="warning-list">
            {live.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="note">没有预算或英语的硬性提醒。</p>
      )}

      <section className="card">
        <p className="kicker">未来大学预估</p>
        <h3>{live.domesticAnchor.tierLabel}</h3>
        <p>{live.domesticAnchor.equivalent}</p>
        {live.domesticAnchor.qsBand || live.domesticAnchor.abroad ? (
          <p>{`${live.domesticAnchor.qsBand ?? ""}${live.domesticAnchor.abroad ?? ""}`}</p>
        ) : null}
      </section>

      <section className="card no-print">
        <p className="kicker">拨杆</p>
        <h2>改一个答案，看结果怎么动</h2>
        <p className="muted">每次只改这一项。适合度和三种体系按当前已发布的规则重算。</p>
        {levers.map((field) => (
          <div className="lever" key={field.key}>
            <span className="label">{field.title}</span>
            <div className="lever-options">
              {field.options.map((option) => {
                const selected = (overrides[field.key] ?? baseAnswers[field.key]) === option.value;
                const origin = baseAnswers[field.key] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`${selected ? "is-on" : ""} ${origin ? "is-origin" : ""}`}
                    onClick={() => choose(field, option.value)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {shifted ? (
          <button className="btn btn-ghost" type="button" onClick={() => { roomSound().button(); setOverrides({}); }}>
            回到填写的答案
          </button>
        ) : null}
      </section>

      <section className="card">
        <p className="kicker">推荐国际学校</p>
        <div className="qr-row">
          <div className="demo-qr">
            <img src="/demo-qr.svg" alt="示范二维码" />
          </div>
          <p>扫描二维码入群获取独家《上海国家高中资料》</p>
        </div>
      </section>

      <div className="nav-row no-print">
        <button className="btn" type="button" onClick={() => { roomSound().button(); window.print(); }}>打印</button>
        <button className="btn btn-primary" type="button" onClick={() => { roomSound().button(); onRestart(); }}>再答一次</button>
      </div>
      </div>
    </main>
  );
}
