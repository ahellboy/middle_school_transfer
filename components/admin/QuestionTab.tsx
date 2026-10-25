import type { AlgorithmConfig } from "../../lib/types";
import { Field } from "./ui";

export function QuestionTab({
  draft,
  patch,
}: {
  draft: AlgorithmConfig;
  patch: (recipe: (draft: AlgorithmConfig) => void) => void;
}) {
  return (
    <div className="stack">
      <p className="muted">
        可以改题干和选项文案。选项代码保持不变，规则靠这些代码匹配。
      </p>
      {draft.fields.map((field, fieldIndex) => (
        <section className="panel" key={field.key}>
          <p className="kicker">{field.title} · {field.key}</p>
          <Field label="题干">
            <textarea
              value={field.prompt}
              onChange={(event) =>
                patch((next) => {
                  next.fields[fieldIndex].prompt = event.target.value;
                })
              }
            />
          </Field>
          {field.options.map((option, optionIndex) => (
            <div className="grid-2" key={option.value}>
              <Field label={`选项文案 · ${option.value}`}>
                <input
                  type="text"
                  value={option.label}
                  onChange={(event) =>
                    patch((next) => {
                      next.fields[fieldIndex].options[optionIndex].label = event.target.value;
                    })
                  }
                />
              </Field>
              <Field label="补充说明">
                <input
                  type="text"
                  value={option.hint ?? ""}
                  onChange={(event) =>
                    patch((next) => {
                      const hint = event.target.value;
                      next.fields[fieldIndex].options[optionIndex].hint = hint || undefined;
                    })
                  }
                />
              </Field>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
