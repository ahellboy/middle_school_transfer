import type { AlgorithmConfig } from "../../lib/types";
import { Field, NumberField } from "./ui";

export function FitTab({
  draft,
  patch,
}: {
  draft: AlgorithmConfig;
  patch: (recipe: (draft: AlgorithmConfig) => void) => void;
}) {
  const weightSum = draft.fit.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <h2>适合度权重</h2>
          <strong className={Math.abs(weightSum - 1) > 0.001 ? "error" : ""}>
            合计 {weightSum.toFixed(2)}
          </strong>
        </div>
        <p className="muted">四项权重要凑成 1。维度内部的权重会按比例折成 100%。</p>
      </section>
      {draft.fit.dimensions.map((dimension, dimensionIndex) => {
        const used = new Set(dimension.parts.map((part) => part.source));
        const available = draft.fields.filter((field) => !used.has(field.key));
        return (
          <section className="panel" key={dimension.id}>
            <div className="panel-head">
              <Field label="维度名称">
                <input
                  type="text"
                  value={dimension.label}
                  onChange={(event) =>
                    patch((next) => {
                      next.fit.dimensions[dimensionIndex].label = event.target.value;
                    })
                  }
                />
              </Field>
              <Field label="权重">
                <NumberField
                  value={dimension.weight}
                  step={0.05}
                  min={0}
                  max={1}
                  onChange={(value) =>
                    patch((next) => {
                      next.fit.dimensions[dimensionIndex].weight = value;
                    })
                  }
                />
              </Field>
            </div>
            <Field label="给顾问看的说明">
              <textarea
                value={dimension.note}
                onChange={(event) =>
                  patch((next) => {
                    next.fit.dimensions[dimensionIndex].note = event.target.value;
                  })
                }
              />
            </Field>
            {dimension.parts.map((part, partIndex) => {
              const field = draft.fields.find((item) => item.key === part.source);
              return (
                <div className="subcard" key={part.source}>
                  <div className="panel-head">
                    <strong>{field?.title ?? part.source}</strong>
                    <NumberField
                      value={part.weight}
                      step={0.1}
                      min={0.1}
                      onChange={(value) =>
                        patch((next) => {
                          next.fit.dimensions[dimensionIndex].parts[partIndex].weight = value;
                        })
                      }
                    />
                  </div>
                  {dimension.parts.length > 1 ? (
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() =>
                        patch((next) => {
                          next.fit.dimensions[dimensionIndex].parts.splice(partIndex, 1);
                        })
                      }
                    >
                      移出这项
                    </button>
                  ) : null}
                </div>
              );
            })}
            {available.length > 0 ? (
              <Field label="加一个计分项">
                <select
                  value=""
                  onChange={(event) => {
                    const source = event.target.value;
                    if (!source) return;
                    patch((next) => {
                      next.fit.dimensions[dimensionIndex].parts.push({ source, weight: 1 });
                      if (!next.scoreMaps[source]) {
                        const field = next.fields.find((item) => item.key === source);
                        const scores: Record<string, number> = {};
                        for (const option of field?.options ?? []) scores[option.value] = 70;
                        next.scoreMaps[source] = { calibrated: false, scores };
                      }
                    });
                  }}
                >
                  <option value="">选择题目</option>
                  {available.map((field) => (
                    <option value={field.key} key={field.key}>
                      {field.title}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </section>
        );
      })}

      <section className="panel">
        <h2>选项分值</h2>
        <p className="muted">标成「未标定」的分值是占位，发布前用试算核对。</p>
        {Object.entries(draft.scoreMaps).map(([key, map]) => {
          const field = draft.fields.find((item) => item.key === key);
          if (!field) return null;
          return (
            <div key={key} className="subcard">
              <div className="panel-head">
                <h3>{field.title}</h3>
                <label>
                  <input
                    type="checkbox"
                    checked={map.calibrated}
                    onChange={(event) =>
                      patch((next) => {
                        next.scoreMaps[key].calibrated = event.target.checked;
                      })
                    }
                  />{" "}
                  已标定
                </label>
              </div>
              {!map.calibrated ? <span className="badge badge-draft">未标定</span> : <span className="badge badge-official">文档或已标定</span>}
              {field.options.map((option) => (
                <div className="panel-head" key={option.value}>
                  <span>{option.label}</span>
                  <NumberField
                    min={0}
                    max={100}
                    value={map.scores[option.value] ?? 0}
                    onChange={(value) =>
                      patch((next) => {
                        next.scoreMaps[key].scores[option.value] = value;
                      })
                    }
                  />
                </div>
              ))}
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h2>分数档</h2>
        {draft.fit.bands.map((band, bandIndex) => (
          <div className="subcard" key={`${band.min}-${bandIndex}`}>
            <div className="grid-2">
              <Field label="从多少分开始">
                <NumberField
                  min={0}
                  max={100}
                  value={band.min}
                  onChange={(value) =>
                    patch((next) => {
                      next.fit.bands[bandIndex].min = value;
                    })
                  }
                />
              </Field>
              <Field label="档名">
                <input
                  type="text"
                  value={band.label}
                  onChange={(event) =>
                    patch((next) => {
                      next.fit.bands[bandIndex].label = event.target.value;
                    })
                  }
                />
              </Field>
            </div>
            <Field label="给学生看的说明">
              <textarea
                value={band.summary}
                onChange={(event) =>
                  patch((next) => {
                    next.fit.bands[bandIndex].summary = event.target.value;
                  })
                }
              />
            </Field>
          </div>
        ))}
      </section>
    </div>
  );
}
