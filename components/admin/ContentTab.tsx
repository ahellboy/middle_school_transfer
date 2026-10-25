import { useState } from "react";
import type { AlgorithmConfig } from "../../lib/types";
import { Field, NumberField } from "./ui";

export function ContentTab({
  draft,
  patch,
}: {
  draft: AlgorithmConfig;
  patch: (recipe: (draft: AlgorithmConfig) => void) => void;
}) {
  const [copyId, setCopyId] = useState("");
  const [copyText, setCopyText] = useState("");
  const rank = draft.fields.find((field) => field.key === "shanghai_rank_tier");
  const countries = draft.fields.find((field) => field.key === "target_country");

  return (
    <div className="stack">
      <section className="panel">
        <h2>体系起算分</h2>
        <p className="muted">匹配分 = 起算分 + 命中的加减分，再执行封顶，最后限制在 0 到 100。</p>
        {draft.curricula.map((curriculum, index) => (
          <div className="panel-head" key={curriculum.id}>
            <div>
              <strong>{curriculum.name}</strong>
              <div className="muted">{curriculum.id}</div>
            </div>
            <Field label="起算分">
              <NumberField
                min={0}
                max={100}
                value={curriculum.base}
                onChange={(base) =>
                  patch((next) => {
                    next.curricula[index].base = base;
                  })
                }
              />
            </Field>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>体制内对照</h2>
        <p className="muted">国内校名和国际举例都出现在学生结果上。按排位定档，按目标国家换学校。这是路径参照，不要写成录取预测。</p>
        {rank?.options.map((option) => {
          const entry = draft.domesticAnchor[option.value] ?? {
            label: option.label,
            equivalent: "",
            qsBand: "",
            abroad: {},
          };
          return (
            <div className="subcard" key={option.value}>
              <Field label={`${option.label} 的档名`}>
                <input
                  type="text"
                  value={entry.label}
                  onChange={(event) =>
                    patch((next) => {
                      const current = next.domesticAnchor[option.value] ?? {
                        label: option.label,
                        equivalent: "",
                        qsBand: "",
                        abroad: {},
                      };
                      next.domesticAnchor[option.value] = { ...current, label: event.target.value };
                    })
                  }
                />
              </Field>
              <Field label="国内说明">
                <textarea
                  value={entry.equivalent}
                  onChange={(event) =>
                    patch((next) => {
                      const current = next.domesticAnchor[option.value] ?? {
                        label: option.label,
                        equivalent: "",
                        qsBand: "",
                        abroad: {},
                      };
                      next.domesticAnchor[option.value] = {
                        ...current,
                        equivalent: event.target.value,
                      };
                    })
                  }
                />
              </Field>
              <Field label="国际档次">
                <textarea
                  value={entry.qsBand ?? ""}
                  onChange={(event) =>
                    patch((next) => {
                      const current = next.domesticAnchor[option.value] ?? {
                        label: option.label,
                        equivalent: "",
                        qsBand: "",
                        abroad: {},
                      };
                      next.domesticAnchor[option.value] = { ...current, qsBand: event.target.value };
                    })
                  }
                />
              </Field>
              {countries?.options.map((country) => (
                <Field label={`${country.label} 的举例`} key={country.value}>
                  <textarea
                    value={entry.abroad?.[country.value] ?? ""}
                    onChange={(event) =>
                      patch((next) => {
                        const current = next.domesticAnchor[option.value] ?? {
                          label: option.label,
                          equivalent: "",
                          qsBand: "",
                          abroad: {},
                        };
                        next.domesticAnchor[option.value] = {
                          ...current,
                          abroad: { ...current.abroad, [country.value]: event.target.value },
                        };
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          );
        })}
      </section>

      <section className="panel">
        <h2>文案</h2>
        {Object.entries(draft.copy).map(([id, text]) => (
          <Field label={id} key={id}>
            <textarea
              value={text}
              onChange={(event) =>
                patch((next) => {
                  next.copy[id] = event.target.value;
                })
              }
            />
          </Field>
        ))}
        <div className="grid-2">
          <Field label="新文案编号">
            <input type="text" value={copyId} onChange={(event) => setCopyId(event.target.value)} />
          </Field>
          <Field label="新文案">
            <input type="text" value={copyText} onChange={(event) => setCopyText(event.target.value)} />
          </Field>
        </div>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            const id = copyId.trim();
            if (!id || draft.copy[id]) return;
            patch((next) => {
              next.copy[id] = copyText.trim() || "新文案";
            });
            setCopyId("");
            setCopyText("");
          }}
        >
          添加文案
        </button>
      </section>
    </div>
  );
}
