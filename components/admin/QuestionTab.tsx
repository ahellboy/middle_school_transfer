import { useState } from "react";
import type { AlgorithmConfig, ClassRankCopy, RecommendBlock } from "../../lib/types";
import { Field } from "./ui";

const recommendDefault: RecommendBlock = {
  title: "推荐国际学校",
  body: "扫描二维码入群获取独家《上海国际高中资料大全》",
  qrSrc: "/assets/demo-qr.svg",
};

const classRankDefault: ClassRankCopy = {
  title: "班级排名",
  prompt: "在班级里，最近一次考试大约排在哪一档？",
  options: [
    { value: "T2", label: "前10%" },
    { value: "T3", label: "前30%" },
    { value: "T4", label: "30%以后" },
  ],
};

export function QuestionTab({
  draft,
  patch,
}: {
  draft: AlgorithmConfig;
  patch: (recipe: (draft: AlgorithmConfig) => void) => void;
}) {
  const recommend = draft.recommend ?? recommendDefault;
  const classRank = draft.classRank ?? classRankDefault;
  const [qrMessage, setQrMessage] = useState("");
  const [qrTick, setQrTick] = useState(0);

  async function replaceQr(file: File) {
    setQrMessage("");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/admin/recommend-qr", {
      method: "POST",
      credentials: "include",
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setQrMessage(data.error || "图片没有换上");
      return;
    }
    patch((next) => {
      next.recommend = { ...(next.recommend ?? recommendDefault), qrSrc: data.qrSrc };
    });
    setQrTick((value) => value + 1);
    setQrMessage("二维码已换上。发布后，小程序才会改用这张图。");
  }

  return (
    <div className="stack">
      <p className="muted">
        可以改每题的标题、题干和选项文字。选项代码保持不变，计分仍靠这些代码。发布后写入小程序配置；体验版需要重新上传才能看到。
      </p>
      {draft.fields.map((field, fieldIndex) => (
        <section className="panel" key={field.key}>
          <p className="kicker">{field.title} · {field.key}</p>
          <Field label="标题">
            <input
              type="text"
              value={field.title}
              onChange={(event) =>
                patch((next) => {
                  next.fields[fieldIndex].title = event.target.value;
                })
              }
            />
          </Field>
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
          {field.key === "shanghai_rank_tier" ? (
            <div className="subcard">
              <p className="kicker">初一到初三看到的班级排名</p>
              <Field label="标题">
                <input
                  type="text"
                  value={classRank.title}
                  onChange={(event) =>
                    patch((next) => {
                      next.classRank = { ...(next.classRank ?? classRankDefault), title: event.target.value };
                    })
                  }
                />
              </Field>
              <Field label="题干">
                <textarea
                  value={classRank.prompt}
                  onChange={(event) =>
                    patch((next) => {
                      next.classRank = { ...(next.classRank ?? classRankDefault), prompt: event.target.value };
                    })
                  }
                />
              </Field>
              {classRank.options.map((option, optionIndex) => (
                <Field label={`班级排名文案 · ${option.value}`} key={option.value}>
                  <input
                    type="text"
                    value={option.label}
                    onChange={(event) =>
                      patch((next) => {
                        const current = next.classRank ?? classRankDefault;
                        const options = current.options.map((item, index) =>
                          index === optionIndex ? { ...item, label: event.target.value } : item,
                        );
                        next.classRank = { ...current, options };
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          ) : null}
        </section>
      ))}

      <section className="panel">
        <p className="kicker">结果页 · 推荐学校</p>
        <Field label="标题">
          <input
            type="text"
            value={recommend.title}
            onChange={(event) =>
              patch((next) => {
                next.recommend = { ...(next.recommend ?? recommendDefault), title: event.target.value };
              })
            }
          />
        </Field>
        <Field label="内容">
          <textarea
            value={recommend.body}
            onChange={(event) =>
              patch((next) => {
                next.recommend = { ...(next.recommend ?? recommendDefault), body: event.target.value };
              })
            }
          />
        </Field>
        <Field label="二维码">
          <img
            src={`/api/admin/recommend-qr?src=${encodeURIComponent(recommend.qrSrc)}&t=${qrTick}`}
            alt="当前二维码"
            style={{ width: 160, height: 160, objectFit: "contain", background: "#fff" }}
          />
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void replaceQr(file);
              event.target.value = "";
            }}
          />
        </Field>
        {qrMessage ? <p className="muted">{qrMessage}</p> : null}
      </section>
    </div>
  );
}
