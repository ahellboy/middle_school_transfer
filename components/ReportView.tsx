import { formatScore, signedScore } from "../lib/format";
import type { EvaluationReport } from "../lib/types";

export function ReportView({
  report,
  compact = false,
}: {
  report: EvaluationReport;
  compact?: boolean;
}) {
  const [first, second] = report.curriculumRanking;
  const gap = first && second ? first.matchPercentage - second.matchPercentage : 99;

  return (
    <article className="stack">
      <section className="card">
        <p className="kicker">转轨适合度 · 配置 v{report.configVersion}</p>
        <div className="score-num">{report.fitScore}</div>
        <span className="band">{report.band.label}</span>
        <p>{report.band.summary}</p>
      </section>

      {report.warnings.length > 0 ? (
        <section className="card" style={{ background: "var(--amber-soft)" }}>
          <h3>需要先看见的限制</h3>
          <ul className="warning-list">
            {report.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="note">没有触发预算或英语的硬性警示。</section>
      )}

      <section className="card">
        <p className="kicker">课程体系</p>
        <h2>哪条更贴这个学生</h2>
        {gap <= 5 && second ? (
          <p className="muted">前两名只差 {gap} 分，一起看，不要只留下第一名。</p>
        ) : null}
        {report.curriculumRanking.map((curriculum, index) => (
          <div className="curriculum" key={curriculum.id}>
            <div className="curriculum-top">
              <div>
                <div className="rank-tag">{index === 0 ? "主推荐" : "备选"}</div>
                <h3>{curriculum.name}</h3>
              </div>
              <strong>{curriculum.matchPercentage}</strong>
            </div>
            <div className={`bar ${index === 0 ? "lead" : ""}`}>
              <span style={{ width: `${curriculum.matchPercentage}%` }} />
            </div>
            <ul className="reasons">
              {curriculum.reasons.slice(0, 2).map((reason) => (
                <li key={reason.text}>{reason.text}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <div className="grid-2">
        <section className="card">
          <p className="kicker">体制内对照</p>
          <h3>{report.domesticAnchor.tierLabel}</h3>
          <p>{report.domesticAnchor.equivalent}</p>
          {report.domesticAnchor.qsBand ? <p>{report.domesticAnchor.qsBand}</p> : null}
          {report.domesticAnchor.abroad ? <p>{report.domesticAnchor.abroad}</p> : null}
        </section>
        <section className="card">
          <p className="kicker">接下来</p>
          <ol className="roadmap">
            {report.actionRoadmap.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </section>
      </div>

      {compact ? null : (
        <section className="card">
          <p className="kicker">填写的画像</p>
          <div className="chips">
            {report.profileEcho.map((item) => (
              <span className="chip" key={item.key}>
                <b>{item.title}</b>
                {item.optionLabel}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <p className="kicker">正式结果的计算过程</p>
        <ul className="formula">
          {report.dimensions.map((dimension) => (
            <li key={dimension.id}>
              <span>
                {dimension.label} {formatScore(dimension.score)} × {Math.round(dimension.weight * 100)}%
              </span>
              <b>{formatScore(dimension.contribution)}</b>
            </li>
          ))}
          {report.fitAdjustments.map((item) => (
            <li key={item.ruleId}>
              <span>
                {item.ruleName}
                {item.draft ? " · 草案" : ""}
              </span>
              <b>{signedScore(item.delta)}</b>
            </li>
          ))}
        </ul>
        <p>
          合计 {formatScore(report.fitRaw)}，报告显示 {report.fitScore}。
        </p>
        {report.dimensions.map((dimension) => (
          <div key={dimension.id}>
            <h3>{dimension.label}</h3>
            {dimension.parts.map((part) => (
              <p className="trace-line" key={part.field}>
                <span>
                  {part.label} · {part.optionLabel}
                  {part.calibrated ? "" : " · 未标定"}
                </span>
                <span>{formatScore(part.score)}</span>
              </p>
            ))}
          </div>
        ))}
        {report.curriculumRanking.map((curriculum) => (
          <div key={curriculum.id}>
            <h3>
              {curriculum.name}：起算 {curriculum.base}
              {curriculum.deltas.map((delta) => ` ${signedScore(delta.delta)}`).join("")}
              {curriculum.cap !== null ? `，封顶 ${curriculum.cap}` : ""}
              ，结果 {curriculum.matchPercentage}
            </h3>
            {curriculum.deltas.map((delta) => (
              <p className="trace-line" key={`${curriculum.id}-${delta.ruleId}`}>
                <span>
                  {delta.ruleName}
                  {delta.draft ? " · 草案" : " · 文档已定"}
                </span>
                <span>{signedScore(delta.delta)}</span>
              </p>
            ))}
          </div>
        ))}
        <p className="muted">{report.configNote}</p>
      </section>
    </article>
  );
}
