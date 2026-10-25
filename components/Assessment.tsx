"use client";

import { useEffect, useState } from "react";
import type { AlgorithmConfig, EvaluationReport, FieldDef, Profile } from "../lib/types";
import { ResultMap } from "./game/ResultMap";
import { Bear, PropArt, answerArtName, shelfArtName } from "./game/props";
import { SoundToggle, roomSound } from "./game/sound";

type Phase = "intro" | "quiz" | "gate" | "handoff" | "result";
type Who = "student" | "parent";
type Mode = "solo" | "pair";

export function Assessment() {
  const [fields, setFields] = useState<FieldDef[] | null>(null);
  const [config, setConfig] = useState<AlgorithmConfig | null>(null);
  const [version, setVersion] = useState(1);
  const [phase, setPhase] = useState<Phase>("intro");
  const [mode, setMode] = useState<Mode>("solo");
  const [who, setWho] = useState<Who>("student");
  const [step, setStep] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Profile>({});
  const [parentAnswers, setParentAnswers] = useState<Profile>({});
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [parentReport, setParentReport] = useState<EvaluationReport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  const answers = who === "parent" ? parentAnswers : studentAnswers;

  useEffect(() => {
    fetch("/api/form")
      .then((response) => response.json())
      .then((data: { fields: FieldDef[]; version: number; config: AlgorithmConfig }) => {
        setFields(data.fields);
        setConfig(data.config);
        setVersion(data.version);
        const saved = sessionStorage.getItem("track-draft");
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as {
              phase?: Phase;
              step?: number;
              mode?: Mode;
              who?: Who;
              studentAnswers?: Profile;
              parentAnswers?: Profile;
            };
            const keep = (source: Profile | undefined) => {
              const valid: Profile = {};
              for (const field of data.fields) {
                const value = source?.[field.key];
                if (typeof value === "string" && field.options.some((option) => option.value === value)) {
                  valid[field.key] = value;
                }
              }
              return valid;
            };
            setStudentAnswers(keep(parsed.studentAnswers));
            setParentAnswers(keep(parsed.parentAnswers));
            if (parsed.mode === "pair") setMode("pair");
            if (parsed.who === "parent") setWho("parent");
            if (typeof parsed.step === "number") setStep(Math.min(parsed.step, data.fields.length - 1));
            if (parsed.phase === "quiz" || parsed.phase === "gate" || parsed.phase === "handoff") setPhase(parsed.phase);
          } catch {
            sessionStorage.removeItem("track-draft");
          }
        }
        setReady(true);
      })
      .catch(() => setError("题目没有打开。"));
  }, []);

  useEffect(() => {
    if (!ready || phase === "result") return;
    sessionStorage.setItem(
      "track-draft",
      JSON.stringify({ phase, step, mode, who, studentAnswers, parentAnswers }),
    );
  }, [ready, phase, step, mode, who, studentAnswers, parentAnswers]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [phase, step, who]);

  useEffect(() => () => roomSound().stop(), []);

  function writeAnswer(value: string) {
    roomSound().tap();
    if (!fields) return;
    const key = fields[step].key;
    const nextAnswers = { ...answers, [key]: value };
    if (who === "parent") setParentAnswers(nextAnswers);
    else setStudentAnswers(nextAnswers);
  }

  function begin(nextMode: Mode) {
    roomSound().button();
    setMode(nextMode);
    setWho("student");
    setStep(0);
    setPhase("quiz");
    setStudentAnswers({});
    setParentAnswers({});
    setReport(null);
    setParentReport(null);
    setError("");
  }

  async function finish(student: Profile, parent: Profile | null) {
    setPending(true);
    setError("");
    const response = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: student }),
    });
    const data = await response.json();
    if (!response.ok) {
      setPending(false);
      setError(data.error || "结果没有整理出来。");
      return;
    }
    let second: EvaluationReport | null = null;
    if (parent) {
      const parentResponse = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: parent }),
      });
      const parentData = await parentResponse.json();
      if (parentResponse.ok) second = parentData.report;
    }
    setReport(data.report);
    setParentReport(second);
    setPending(false);
    roomSound().result();
    setPhase("result");
    sessionStorage.removeItem("track-draft");
  }

  function advance() {
    roomSound().button();
    if (!fields) return;
    const field = fields[step];
    if (field.key === "mindset_exploration") {
      setPhase("gate");
      return;
    }
    if (step < fields.length - 1) {
      setStep(step + 1);
      return;
    }
    if (mode === "pair" && who === "student") {
      setPhase("handoff");
      return;
    }
    finish(studentAnswers, mode === "pair" ? parentAnswers : null);
  }

  function back() {
    roomSound().button();
    if (!fields) return;
    if (phase === "gate") {
      const englishIndex = fields.findIndex((item) => item.key === "english_level");
      setPhase("quiz");
      setStep(englishIndex >= 0 ? englishIndex : Math.max(0, step - 1));
      return;
    }
    if (step === 0) {
      if (who === "parent") setPhase("handoff");
      else setPhase("intro");
      return;
    }
    setStep(step - 1);
  }

  function restart() {
    setPhase("intro");
    setWho("student");
    setStep(0);
    setStudentAnswers({});
    setParentAnswers({});
    setReport(null);
    setParentReport(null);
    setError("");
    sessionStorage.removeItem("track-draft");
  }

  if (error && !fields) {
    return <main className="room"><p className="error">{error}</p></main>;
  }
  if (!fields || !config) {
    return <main className="room"><p className="pending">题目还在摆上桌。</p></main>;
  }

  if (phase === "result" && report) {
    return (
      <ResultMap
        config={config}
        fields={fields}
        official={report}
        answers={studentAnswers}
        parentReport={parentReport}
        parentAnswers={mode === "pair" ? parentAnswers : null}
        onRestart={restart}
      />
    );
  }

  const field = fields[step];
  const selected = field ? answers[field.key] : undefined;
  const gateOpen = answers.english_level === "A" && answers.mindset_exploration === "A";
  const lastStep = step === fields.length - 1;
  const closing = lastStep && !(mode === "pair" && who === "student");

  return (
    <main className="room">
      <SoundToggle />
      <section className="room-scene">
        <ol className="shelf">
          {fields.map((item, index) => {
            const done = Boolean(answers[item.key]);
            const current = phase === "quiz" && index === step;
            return (
              <li key={item.key} className={`shelf-item ${done ? "is-done" : ""} ${current ? "is-current" : ""}`}>
                <PropArt name={shelfArtName(item.key)} />
              </li>
            );
          })}
        </ol>
        <Bear />
        <div className="room-play">
          {phase === "intro" ? (
            <>
              <div className="bubble">
                <p className="bubble-kicker">九道题</p>
                <p className="bubble-prompt">每题点一件物品，就是你的回答。分数是终点的读数，不是通关奖励。</p>
              </div>
              <div className="room-nav">
                <button className="btn btn-primary" type="button" onClick={() => begin("solo")}>一个人回答</button>
                <button className="btn" type="button" onClick={() => begin("pair")}>学生和家长各答一次</button>
              </div>
            </>
          ) : null}

          {phase === "quiz" && field ? (
            <>
              <div className="bubble">
                <p className="bubble-kicker">
                  {who === "parent" ? "家长在答" : "学生在答"} · {field.title} · {step + 1}/{fields.length} · v{version}
                </p>
                <p className="bubble-prompt">{field.prompt}</p>
              </div>
              <div className="pedestals">
                {field.options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`prop ${selected === option.value ? "is-selected" : ""}`}
                    aria-pressed={selected === option.value}
                    onClick={() => writeAnswer(option.value)}
                  >
                    <span className="prop-figure">
                      <PropArt name={answerArtName(field.key, option.value)} />
                    </span>
                    <span className="pedestal" />
                    <span className="prop-label">{option.label}</span>
                  </button>
                ))}
              </div>
              {error ? <p className="error">{error}</p> : null}
              <div className="room-nav">
                <button className="btn btn-ghost" type="button" onClick={back}>上一题</button>
                <button className="btn btn-primary" type="button" disabled={!selected || pending} onClick={advance}>
                  {pending ? "正在整理结果…" : closing ? "看结果" : lastStep ? "换家长" : "下一题"}
                </button>
              </div>
            </>
          ) : null}

          {phase === "gate" ? (
            <>
              <div className="bubble">
                <p className="bubble-kicker">IB 的门槛</p>
                <p className="bubble-prompt">
                  {gateOpen
                    ? "英语和探究都主动。按当前规则，IB 不会被门槛压低。"
                    : "英语或探究还不是最主动的一档。IB 先封顶，另外两种体系继续按各自的规则计算。"}
                </p>
                {answers.english_level === "C" && answers.mindset_exploration === "C" ? (
                  <p className="bubble-note">两项都偏吃力时，结果里还会建议先做半年到一年的衔接。</p>
                ) : null}
              </div>
              <div className="room-nav">
                <button className="btn btn-ghost" type="button" onClick={back}>改这两题</button>
                <button className="btn btn-primary" type="button" onClick={() => { roomSound().button(); setPhase("quiz"); setStep(step + 1); }}>继续</button>
              </div>
            </>
          ) : null}

          {phase === "handoff" ? (
            <>
              <div className="bubble">
                <p className="bubble-kicker">换人</p>
                <p className="bubble-prompt">换家长来坐。家长再答一遍同样的九题。两人答得不一样的地方，会在结果里单独摊开。</p>
              </div>
              <div className="room-nav">
                <button className="btn btn-ghost" type="button" onClick={() => { roomSound().button(); setWho("student"); setStep(fields.length - 1); setPhase("quiz"); }}>回到学生的最后一题</button>
                <button className="btn btn-primary" type="button" onClick={() => { roomSound().button(); setWho("parent"); setParentAnswers({}); setStep(0); setPhase("quiz"); }}>家长开始</button>
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
