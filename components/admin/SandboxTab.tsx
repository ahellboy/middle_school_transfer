import { useState } from "react";
import { fixtures } from "../../lib/fixtures";
import type { AlgorithmConfig, EvaluationReport, Profile, ReportLog } from "../../lib/types";
import { looksLikeConfig } from "../../lib/validate";
import { ReportView } from "../ReportView";

type VersionMeta = { version: number; updatedAt: string };
type Row = {
  name: string;
  draft: EvaluationReport | null;
  published: EvaluationReport | null;
  draftError: string | null;
};

function formatTime(iso: string): string {
  if (!iso) return "尚未写入";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function SandboxTab({
  draft,
  published,
  versions,
  recent,
  errors,
  onRestore,
  onReset,
  onReplace,
}: {
  draft: AlgorithmConfig;
  published: AlgorithmConfig;
  versions: VersionMeta[];
  recent: ReportLog[];
  errors: string[];
  onRestore: (version: number) => void;
  onReset: () => void;
  onReplace: (config: AlgorithmConfig) => void;
}) {
  const [custom, setCustom] = useState<Profile>(structuredClone(fixtures[0].profile));
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [history, setHistory] = useState<ReportLog | null>(null);

  async function run(named: Array<{ name: string; profile: Profile }>) {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/preview", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: draft, profiles: named.map((item) => item.profile) }),
    });
    const data = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error || "试算没有完成");
      return;
    }
    setRows(
      named.map((item, index) => ({
        name: item.name,
        draft: data.results[index]?.draft ?? null,
        published: data.results[index]?.published ?? null,
        draftError: data.results[index]?.draftError ?? null,
      })),
    );
    setOpen(named[0]?.name ?? null);
  }

  return (
    <div className="stack">
      <section className="panel">
        <h2>版本说明</h2>
        <textarea
          value={draft.note}
          onChange={(event) => {
            const value = event.target.value;
            onReplace({ ...draft, note: value });
          }}
        />
        <p className="muted">这段说明只出现在后台试算的计算过程里。学生结果页不显示计算过程。已发布版本是 v{published.version}。</p>
      </section>

      {errors.length > 0 ? (
        <section className="panel">
          <h2 className="error">发布前要先改</h2>
          <ul className="warning-list">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="note">当前草案可以通过发布检查。</p>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>样例试算</h2>
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy}
            onClick={() => run(fixtures.map((fixture) => ({ name: fixture.name, profile: fixture.profile })))}
          >
            试算三个样例
          </button>
        </div>
        <div className="inline-actions">
          {fixtures.map((fixture) => (
            <button
              className="btn btn-ghost"
              type="button"
              key={fixture.id}
              onClick={() => {
                setCustom(structuredClone(fixture.profile));
                run([{ name: fixture.name, profile: fixture.profile }]);
              }}
            >
              {fixture.name}
            </button>
          ))}
        </div>
        <div className="grid-2" style={{ marginTop: 16 }}>
          {draft.fields.map((field) => (
            <label className="field" key={field.key}>
              <span>{field.title}</span>
              <select
                value={custom[field.key] ?? ""}
                onChange={(event) => setCustom({ ...custom, [field.key]: event.target.value })}
              >
                {field.options.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <button className="btn" type="button" disabled={busy} onClick={() => run([{ name: "自定义画像", profile: custom }])}>
          试算当前画像
        </button>
        {message ? <p className="error">{message}</p> : null}
      </section>

      {rows.length > 0 ? (
        <section className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>画像</th>
                <th>草案适合度</th>
                <th>已发布</th>
                <th>草案第一名</th>
                <th>已发布第一名</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const fitDelta = row.draft && row.published ? row.draft.fitScore - row.published.fitScore : null;
                return (
                  <tr key={row.name}>
                    <td>
                      <button className="btn btn-ghost" type="button" onClick={() => setOpen(row.name)}>
                        {row.name}
                      </button>
                    </td>
                    <td>{row.draftError ? row.draftError : row.draft?.fitScore}</td>
                    <td>
                      {row.published?.fitScore}
                      {fitDelta ? (
                        <div className={fitDelta > 0 ? "delta-up" : "delta-down"}>
                          {fitDelta > 0 ? "+" : ""}
                          {fitDelta}
                        </div>
                      ) : null}
                    </td>
                    <td>{row.draft?.curriculumRanking[0] ? `${row.draft.curriculumRanking[0].name} ${row.draft.curriculumRanking[0].matchPercentage}` : "—"}</td>
                    <td>{row.published?.curriculumRanking[0] ? `${row.published.curriculumRanking[0].name} ${row.published.curriculumRanking[0].matchPercentage}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.filter((row) => row.name === open).map((row) => (
            <div className="grid-2" key={row.name} style={{ marginTop: 16 }}>
              <div>
                <h3>草案</h3>
                {row.draft ? <ReportView report={row.draft} compact /> : <p>{row.draftError}</p>}
              </div>
              <div>
                <h3>已发布 v{published.version}</h3>
                {row.published ? <ReportView report={row.published} compact /> : <p>已发布配置无法计算这份画像。</p>}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="panel">
        <h2>历史版本</h2>
        <p className="muted">载入只会放进草案，不会改掉已经发布的版本。已经生成的报告仍用当时的结果。</p>
        <div className="stack">
          {versions.map((version) => (
            <div className="panel-head" key={version.version}>
              <span>v{version.version} · {formatTime(version.updatedAt)}</span>
              <button className="btn btn-ghost" type="button" onClick={() => onRestore(version.version)}>
                载入草案
              </button>
            </div>
          ))}
        </div>
        <button
          className="btn btn-danger"
          type="button"
          onClick={() => {
            if (confirm("用出厂规则覆盖当前草案？已发布版本不变。")) onReset();
          }}
        >
          草案恢复出厂
        </button>
      </section>

      <section className="panel">
        <h2>最近评估</h2>
        {recent.length === 0 ? <p className="muted">还没有学生提交。</p> : null}
        {recent.map((item) => (
          <div className="panel-head" key={item.at}>
            <span>
              {formatTime(item.at)} · v{item.report.configVersion} · {item.report.fitScore} 分 · {item.report.curriculumRanking[0]?.name}
            </span>
            <button className="btn btn-ghost" type="button" onClick={() => setHistory(item)}>
              查看当时的报告
            </button>
          </div>
        ))}
        {history ? <ReportView report={history.report} /> : null}
      </section>

      <section className="panel">
        <h2>JSON</h2>
        <button className="btn btn-ghost" type="button" onClick={() => setJsonText(JSON.stringify(draft, null, 2))}>
          展开当前草案
        </button>
        <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} style={{ minHeight: 180, marginTop: 12 }} />
        <button
          className="btn"
          type="button"
          onClick={() => {
            try {
              const parsed = JSON.parse(jsonText) as unknown;
              if (!looksLikeConfig(parsed)) {
                setMessage("JSON 里缺少题目、规则或体系。");
                return;
              }
              onReplace(parsed);
              setMessage("已替换编辑中的草案，还没有保存。");
            } catch {
              setMessage("JSON 无法解析。");
            }
          }}
        >
          用这份 JSON 替换草案
        </button>
      </section>
    </div>
  );
}
