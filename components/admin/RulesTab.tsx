import { useState } from "react";
import type { AlgorithmConfig, Condition, Effect, Rule } from "../../lib/types";
import { isGroup } from "../../lib/types";
import { affectsScore, summarizeEffects, summarizeWhen } from "./rule-text";
import { Field, NumberField } from "./ui";

function asGroup(when: Condition): { op: "all" | "any"; items: Condition[] } {
  if (isGroup(when)) return when;
  return { op: "all", items: [when] };
}

export function RulesTab({
  draft,
  patch,
}: {
  draft: AlgorithmConfig;
  patch: (recipe: (draft: AlgorithmConfig) => void) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "on">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const filtering = filter !== "all" || query.trim().length > 0;
  const shown = draft.rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => {
      if (filter === "draft" && !rule.draft) return false;
      if (filter === "on" && !rule.enabled) return false;
      const haystack = `${rule.name} ${rule.description} ${rule.id}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });

  const update = (index: number, recipe: (rule: Rule) => void) => {
    patch((next) => recipe(next.rules[index]));
  };

  return (
    <div className="stack">
      <section className="panel">
        <p className="muted">
          规则从上到下执行。封顶取更低的那个。没有条件、又会改分的规则，会对所有学生生效。
        </p>
        <div className="inline-actions">
          <input
            type="text"
            placeholder="搜索规则"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}>
            <option value="all">全部</option>
            <option value="draft">只看草案</option>
            <option value="on">只看启用</option>
          </select>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              const id = `rule_${Date.now()}`;
              patch((next) => {
                next.rules.unshift({
                  id,
                  name: "新规则",
                  description: "",
                  enabled: true,
                  draft: true,
                  when: { op: "all", items: [] },
                  effects: [{ type: "add_fit", delta: 0 }],
                });
              });
              setOpenId(id);
              setFilter("all");
              setQuery("");
            }}
          >
            新增规则
          </button>
        </div>
      </section>

      {shown.map(({ rule, index }) => {
        const group = asGroup(rule.when);
        const nested = group.items.some((item) => isGroup(item));
        const always = group.items.length === 0;
        return (
          <article className="rule" key={rule.id}>
            <div className="rule-head">
              <div>
                <strong>{rule.name}</strong>
                <div className="muted">{summarizeWhen(rule, draft)} · {summarizeEffects(rule, draft)}</div>
              </div>
              <div className="inline-actions">
                {rule.draft ? <span className="badge badge-draft">草案</span> : <span className="badge badge-official">文档已定</span>}
                {always && affectsScore(rule) ? <span className="badge badge-warn">对所有学生改分</span> : null}
                <label>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(event) => update(index, (item) => { item.enabled = event.target.checked; })}
                  />{" "}
                  启用
                </label>
                <button className="btn btn-ghost" type="button" onClick={() => setOpenId(openId === rule.id ? null : rule.id)}>
                  {openId === rule.id ? "收起" : "编辑"}
                </button>
              </div>
            </div>
            {openId === rule.id ? (
              <div>
                <div className="grid-2">
                  <Field label="名称">
                    <input type="text" value={rule.name} onChange={(event) => update(index, (item) => { item.name = event.target.value; })} />
                  </Field>
                  <label className="field">
                    <span>草案</span>
                    <input
                      type="checkbox"
                      checked={rule.draft}
                      onChange={(event) => update(index, (item) => { item.draft = event.target.checked; })}
                    />
                  </label>
                </div>
                <Field label="说明">
                  <textarea value={rule.description} onChange={(event) => update(index, (item) => { item.description = event.target.value; })} />
                </Field>
                <div className="rule-edit">
                  <div>
                    <h3>条件</h3>
                    {nested ? <p className="error">这条规则含嵌套条件，请在试算页用 JSON 修改。</p> : null}
                    <Field label="如何组合">
                      <select
                        value={group.op}
                        onChange={(event) =>
                          update(index, (item) => {
                            const current = asGroup(item.when);
                            item.when = { op: event.target.value as "all" | "any", items: current.items };
                          })
                        }
                      >
                        <option value="all">同时满足</option>
                        <option value="any">满足任一</option>
                      </select>
                    </Field>
                    {group.items.map((item, itemIndex) => {
                      if (isGroup(item)) return null;
                      const field = draft.fields.find((entry) => entry.key === item.field) ?? draft.fields[0];
                      return (
                        <div className="subcard" key={`${rule.id}-${itemIndex}`}>
                          <Field label="题目">
                            <select
                              value={item.field}
                              onChange={(event) =>
                                update(index, (current) => {
                                  const leaf = asGroup(current.when).items[itemIndex];
                                  if (!leaf || isGroup(leaf)) return;
                                  leaf.field = event.target.value;
                                  const nextField = draft.fields.find((entry) => entry.key === event.target.value);
                                  leaf.value = nextField?.options[0]?.value ?? "";
                                })
                              }
                            >
                              {draft.fields.map((entry) => (
                                <option value={entry.key} key={entry.key}>{entry.title}</option>
                              ))}
                            </select>
                          </Field>
                          <Field label="比较">
                            <select
                              value={item.op}
                              onChange={(event) =>
                                update(index, (current) => {
                                  const leaf = asGroup(current.when).items[itemIndex];
                                  if (!leaf || isGroup(leaf)) return;
                                  leaf.op = event.target.value as "eq" | "neq";
                                })
                              }
                            >
                              <option value="eq">等于</option>
                              <option value="neq">不等于</option>
                            </select>
                          </Field>
                          <Field label="选项">
                            <select
                              value={item.value}
                              onChange={(event) =>
                                update(index, (current) => {
                                  const leaf = asGroup(current.when).items[itemIndex];
                                  if (!leaf || isGroup(leaf)) return;
                                  leaf.value = event.target.value;
                                })
                              }
                            >
                              {field.options.map((option) => (
                                <option value={option.value} key={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </Field>
                          <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={() =>
                              update(index, (current) => {
                                const currentGroup = asGroup(current.when);
                                currentGroup.items.splice(itemIndex, 1);
                                current.when = currentGroup;
                              })
                            }
                          >
                            删除条件
                          </button>
                        </div>
                      );
                    })}
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() =>
                        update(index, (current) => {
                          const currentGroup = asGroup(current.when);
                          currentGroup.items.push({
                            op: "eq",
                            field: draft.fields[0].key,
                            value: draft.fields[0].options[0].value,
                          });
                          current.when = currentGroup;
                        })
                      }
                    >
                      加条件
                    </button>
                  </div>
                  <div>
                    <h3>效果</h3>
                    {rule.effects.map((effect, effectIndex) => (
                      <EffectEditor
                        key={`${rule.id}-effect-${effectIndex}`}
                        effect={effect}
                        draft={draft}
                        onChange={(nextEffect) =>
                          update(index, (current) => {
                            current.effects[effectIndex] = nextEffect;
                          })
                        }
                        onRemove={() =>
                          update(index, (current) => {
                            current.effects.splice(effectIndex, 1);
                          })
                        }
                      />
                    ))}
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() =>
                        update(index, (current) => {
                          current.effects.push({ type: "add_fit", delta: 0 });
                        })
                      }
                    >
                      加效果
                    </button>
                  </div>
                </div>
                <div className="inline-actions" style={{ marginTop: 12 }}>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={filtering || index === 0}
                    onClick={() =>
                      patch((next) => {
                        const [item] = next.rules.splice(index, 1);
                        next.rules.splice(index - 1, 0, item);
                      })
                    }
                  >
                    上移
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    disabled={filtering || index === draft.rules.length - 1}
                    onClick={() =>
                      patch((next) => {
                        const [item] = next.rules.splice(index, 1);
                        next.rules.splice(index + 1, 0, item);
                      })
                    }
                  >
                    下移
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() =>
                      patch((next) => {
                        const copy = structuredClone(rule);
                        copy.id = `rule_${Date.now()}`;
                        copy.name = `${rule.name} 副本`;
                        copy.draft = true;
                        next.rules.splice(index + 1, 0, copy);
                      })
                    }
                  >
                    复制
                  </button>
                  <button
                    className="btn btn-danger"
                    type="button"
                    onClick={() => {
                      if (!confirm(`删除规则「${rule.name}」？`)) return;
                      patch((next) => {
                        next.rules.splice(index, 1);
                      });
                    }}
                  >
                    删除
                  </button>
                </div>
                {filtering ? <p className="muted">清空筛选后才能调整顺序。</p> : null}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function EffectEditor({
  effect,
  draft,
  onChange,
  onRemove,
}: {
  effect: Effect;
  draft: AlgorithmConfig;
  onChange: (effect: Effect) => void;
  onRemove: () => void;
}) {
  const copyIds = Object.keys(draft.copy);
  const changeType = (type: Effect["type"]) => {
    if (type === "add_fit") onChange({ type, delta: 0 });
    if (type === "warning") onChange({ type, copyId: copyIds[0] ?? "" });
    if (type === "roadmap") onChange({ type, copyId: copyIds[0] ?? "" });
    if (type === "add_curriculum") onChange({ type, curriculum: draft.curricula[0]?.id ?? "", delta: 0 });
    if (type === "cap_curriculum") onChange({ type, curriculum: draft.curricula[0]?.id ?? "", cap: 65 });
  };
  return (
    <div className="subcard">
      <Field label="类型">
        <select value={effect.type} onChange={(event) => changeType(event.target.value as Effect["type"])}>
          <option value="add_fit">适合度加减</option>
          <option value="add_curriculum">体系加减</option>
          <option value="cap_curriculum">体系封顶</option>
          <option value="warning">警示</option>
          <option value="roadmap">路线图</option>
        </select>
      </Field>
      {effect.type === "add_fit" ? (
        <Field label="分数">
          <NumberField value={effect.delta} onChange={(delta) => onChange({ ...effect, delta })} />
        </Field>
      ) : null}
      {effect.type === "add_curriculum" || effect.type === "cap_curriculum" ? (
        <Field label="体系">
          <select
            value={effect.curriculum}
            onChange={(event) => onChange({ ...effect, curriculum: event.target.value })}
          >
            {draft.curricula.map((curriculum) => (
              <option value={curriculum.id} key={curriculum.id}>{curriculum.name}</option>
            ))}
          </select>
        </Field>
      ) : null}
      {effect.type === "add_curriculum" ? (
        <Field label="分数">
          <NumberField value={effect.delta} onChange={(delta) => onChange({ ...effect, delta })} />
        </Field>
      ) : null}
      {effect.type === "cap_curriculum" ? (
        <Field label="封顶">
          <NumberField min={0} max={100} value={effect.cap} onChange={(cap) => onChange({ ...effect, cap })} />
        </Field>
      ) : null}
      {effect.type === "warning" || effect.type === "roadmap" ? (
        <CopySelect
          label="文案"
          value={effect.copyId}
          draft={draft}
          onChange={(copyId) => onChange({ ...effect, copyId })}
        />
      ) : null}
      {effect.type === "add_curriculum" ? (
        <CopySelect
          label="推荐句，可空"
          value={effect.reasonCopyId ?? ""}
          draft={draft}
          allowEmpty
          onChange={(reasonCopyId) => onChange({ ...effect, reasonCopyId: reasonCopyId || undefined })}
        />
      ) : null}
      {effect.type === "cap_curriculum" ? (
        <>
          <CopySelect
            label="推荐句，可空"
            value={effect.reasonCopyId ?? ""}
            draft={draft}
            allowEmpty
            onChange={(reasonCopyId) => onChange({ ...effect, reasonCopyId: reasonCopyId || undefined })}
          />
          <CopySelect
            label="警示，可空"
            value={effect.warningCopyId ?? ""}
            draft={draft}
            allowEmpty
            onChange={(warningCopyId) => onChange({ ...effect, warningCopyId: warningCopyId || undefined })}
          />
        </>
      ) : null}
      <button className="btn btn-ghost" type="button" onClick={onRemove}>删除效果</button>
    </div>
  );
}

function CopySelect({
  label,
  value,
  draft,
  allowEmpty = false,
  onChange,
}: {
  label: string;
  value: string;
  draft: AlgorithmConfig;
  allowEmpty?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {allowEmpty ? <option value="">不使用</option> : null}
        {Object.entries(draft.copy).map(([id, text]) => (
          <option value={id} key={id}>{text.slice(0, 28)}</option>
        ))}
      </select>
    </Field>
  );
}
