import { useEffect, useState } from "react";
import { canonical } from "../../lib/signature";
import type { AlgorithmConfig, ReportLog } from "../../lib/types";
import { validateConfig } from "../../lib/validate";
import { ContentTab } from "./ContentTab";
import { FitTab } from "./FitTab";
import { QuestionTab } from "./QuestionTab";
import { RulesTab } from "./RulesTab";
import { SandboxTab } from "./SandboxTab";

type VersionMeta = { version: number; updatedAt: string };
type Tab = "questions" | "fit" | "rules" | "copy" | "sandbox";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "questions", label: "题目" },
  { id: "fit", label: "适合度" },
  { id: "rules", label: "规则" },
  { id: "copy", label: "体系与文案" },
  { id: "sandbox", label: "试算发布" },
];

export function AdminApp() {
  const [auth, setAuth] = useState<"loading" | "anon" | "in">("loading");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [draft, setDraft] = useState<AlgorithmConfig | null>(null);
  const [saved, setSaved] = useState<AlgorithmConfig | null>(null);
  const [published, setPublished] = useState<AlgorithmConfig | null>(null);
  const [versions, setVersions] = useState<VersionMeta[]>([]);
  const [recent, setRecent] = useState<ReportLog[]>([]);
  const [tab, setTab] = useState<Tab>("sandbox");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/config", { credentials: "include" });
    if (response.status === 401) {
      setAuth("anon");
      return;
    }
    const data = await response.json();
    setDraft(data.draft);
    setSaved(structuredClone(data.draft));
    setPublished(data.published);
    setVersions(data.versions);
    setRecent(data.recent);
    setAuth("in");
  }

  useEffect(() => {
    load().catch(() => setLoginError("后台没有打开。"));
  }, []);

  const memoryDirty = draft && saved ? canonical(draft) !== canonical(saved) : false;
  const unpublished = draft && published ? canonical(draft) !== canonical(published) : false;
  const errors = draft ? validateConfig(draft) : [];

  useEffect(() => {
    const onLeave = (event: BeforeUnloadEvent) => {
      if (!memoryDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [memoryDirty]);

  function patch(recipe: (next: AlgorithmConfig) => void) {
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      recipe(next);
      return next;
    });
  }

  async function login() {
    setLoginError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!response.ok) {
      setLoginError("口令不对");
      return;
    }
    await load();
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    const response = await fetch("/api/admin/config", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: draft }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "没有保存");
      return;
    }
    setDraft(data.draft);
    setSaved(structuredClone(data.draft));
    setMessage("草案已保存，学生评估仍使用已发布版本。");
  }

  async function publish() {
    if (!draft || errors.length > 0) return;
    if (!confirm("发布后，新的学生评估会使用这套规则。已经生成的报告不会变。")) return;
    setBusy(true);
    const response = await fetch("/api/admin/publish", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: draft }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage((data.errors || [data.error || "没有发布"]).join("；"));
      return;
    }
    setDraft(data.draft);
    setSaved(structuredClone(data.draft));
    setPublished(data.published);
    setVersions((current) => [
      { version: data.published.version, updatedAt: data.published.updatedAt },
      ...current,
    ]);
    setMessage(`已发布 v${data.published.version}。`);
  }

  if (auth === "loading") {
    return <main className="page"><p className="pending">正在打开算法后台…</p></main>;
  }

  if (auth === "anon" || !draft || !published) {
    return (
      <main className="page">
        <form
          className="login"
          onSubmit={(event) => {
            event.preventDefault();
            login();
          }}
        >
          <p className="kicker">算法后台</p>
          <h1>登录</h1>
          <p className="muted">本地默认口令是 track-2026。这只适合自己的电脑，不能当成公开网站的防护。</p>
          <label className="field">
            <span>口令</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {loginError ? <p className="error">{loginError}</p> : null}
          <button className="btn btn-primary" type="submit">进入</button>
        </form>
      </main>
    );
  }

  const status = memoryDirty ? "有未保存的修改" : unpublished ? "草案已保存，尚未发布" : "与已发布版本一致";

  return (
    <main className="page">
      <p className="kicker">算法后台</p>
      <div className="panel-head">
        <h1>权重和规则</h1>
        <button
          className="btn btn-ghost no-print"
          type="button"
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
            setAuth("anon");
            setDraft(null);
          }}
        >
          退出
        </button>
      </div>
      <p className="lead">学生页只读已发布的版本。改完先试算，再发布。旧报告留着当时的结果。</p>
      <div className="admin-tabs">
        {tabs.map((item) => (
          <button className={`tab ${tab === item.id ? "is-on" : ""}`} type="button" key={item.id} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === "questions" ? <QuestionTab draft={draft} patch={patch} /> : null}
      {tab === "fit" ? <FitTab draft={draft} patch={patch} /> : null}
      {tab === "rules" ? <RulesTab draft={draft} patch={patch} /> : null}
      {tab === "copy" ? <ContentTab draft={draft} patch={patch} /> : null}
      {tab === "sandbox" ? (
        <SandboxTab
          draft={draft}
          published={published}
          versions={versions}
          recent={recent}
          errors={errors}
          onReplace={(config) => setDraft(config)}
          onRestore={async (version) => {
            const response = await fetch("/api/admin/restore", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ version }),
            });
            const data = await response.json();
            if (!response.ok) {
              setMessage(data.error || "没有载入");
              return;
            }
            setDraft(data.draft);
            setSaved(structuredClone(data.draft));
            setMessage(`已把 v${version} 载入草案。`);
          }}
          onReset={async () => {
            const response = await fetch("/api/admin/reset", { method: "POST", credentials: "include" });
            const data = await response.json();
            setDraft(data.draft);
            setSaved(structuredClone(data.draft));
            setMessage("草案已恢复出厂，已发布版本没变。");
          }}
        />
      ) : null}
      {message ? <p className="note">{message}</p> : null}
      <div className="savebar no-print">
        <span className="status">{status}{errors.length ? ` · ${errors.length} 个发布问题` : ""}</span>
        <button className="btn" type="button" disabled={busy || !memoryDirty} onClick={save}>保存草案</button>
        <button className="btn btn-primary" type="button" disabled={busy || errors.length > 0} onClick={publish}>发布</button>
      </div>
    </main>
  );
}
