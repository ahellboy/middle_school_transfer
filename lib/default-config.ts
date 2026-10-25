import type { AlgorithmConfig, Condition, Rule } from "./types";

function eq(field: string, value: string): Condition {
  return { op: "eq", field, value };
}

function neq(field: string, value: string): Condition {
  return { op: "neq", field, value };
}

function all(...items: Condition[]): Condition {
  return { op: "all", items };
}

function any(...items: Condition[]): Condition {
  return { op: "any", items };
}

function always(): Condition {
  return { op: "all", items: [] };
}

const rules: Rule[] = [
  {
    id: "budget_low",
    name: "预算受限警示",
    description: "文档规定。只出警示，不另外扣适合度。预算高低已经算进家庭保障的分值。",
    enabled: true,
    draft: false,
    when: eq("budget_tier", "B1_LOW"),
    effects: [{ type: "warning", copyId: "budget_limited" }],
  },
  {
    id: "english_warning",
    name: "英语与探究双低",
    description: "文档规定。英语吃力且探究抗拒时，适合度扣 15 分，并提示先衔接。",
    enabled: true,
    draft: false,
    when: all(eq("english_level", "C"), eq("mindset_exploration", "C")),
    effects: [
      { type: "add_fit", delta: -15 },
      { type: "warning", copyId: "english_bridge" },
    ],
  },
  {
    id: "alevel_stem",
    name: "A-Level 数理加分",
    description: "文档规定：学科优势为数理极强时，A-Level 加 20。",
    enabled: true,
    draft: false,
    when: eq("subject_strength", "STEM_STRONG"),
    effects: [
      {
        type: "add_curriculum",
        curriculum: "A-Level",
        delta: 20,
        reasonCopyId: "reason_alevel_stem",
      },
    ],
  },
  {
    id: "ap_us",
    name: "AP 美国方向加分",
    description: "文档规定：目标美国，且自控不是深度依赖时，AP 加 25。",
    enabled: true,
    draft: false,
    when: all(eq("target_country", "US"), neq("self_control", "C")),
    effects: [
      {
        type: "add_curriculum",
        curriculum: "AP",
        delta: 25,
        reasonCopyId: "reason_ap_us",
      },
    ],
  },
  {
    id: "ib_ready",
    name: "IB 高门槛加分",
    description: "文档说英语和探究都处于最强一档时 IB 较高。加 18 分是草案，可直接改。",
    enabled: true,
    draft: true,
    when: all(eq("english_level", "A"), eq("mindset_exploration", "A")),
    effects: [
      {
        type: "add_curriculum",
        curriculum: "IB",
        delta: 18,
        reasonCopyId: "reason_ib_ready",
      },
    ],
  },
  {
    id: "ib_gate",
    name: "IB 未达门槛封顶",
    description: "文档规定不满足英语 A 且探究 A 时压低 IB。封顶 65 分是草案。",
    enabled: true,
    draft: true,
    when: any(neq("english_level", "A"), neq("mindset_exploration", "A")),
    effects: [
      {
        type: "cap_curriculum",
        curriculum: "IB",
        cap: 65,
        reasonCopyId: "reason_ib_capped",
        warningCopyId: "ib_pressure",
      },
    ],
  },
  {
    id: "country_uk",
    name: "英国香港新加坡方向",
    description: "草案。目标英、港、新时抬高 A-Level。",
    enabled: true,
    draft: true,
    when: eq("target_country", "UK_HK_SG"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: 12, reasonCopyId: "reason_alevel_uk" },
      { type: "add_curriculum", curriculum: "IB", delta: 4 },
    ],
  },
  {
    id: "country_ca",
    name: "加拿大澳洲方向",
    description: "草案。加拿大或澳洲方向给 A-Level 和 AP 各一点加分。",
    enabled: true,
    draft: true,
    when: eq("target_country", "CA_AU"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: 6 },
      { type: "add_curriculum", curriculum: "AP", delta: 4 },
    ],
  },
  {
    id: "country_open",
    name: "目标国家未定",
    description: "草案。国家未定时略抬高 IB，因为去向更宽。",
    enabled: true,
    draft: true,
    when: eq("target_country", "UNDECIDED"),
    effects: [
      { type: "add_curriculum", curriculum: "IB", delta: 8, reasonCopyId: "reason_ib_country" },
    ],
  },
  {
    id: "stem_side",
    name: "数理强，AP 略加、IB 略减",
    description: "草案。数理强除了 A-Level 的规定加分外，AP 略加、IB 略减。",
    enabled: true,
    draft: true,
    when: eq("subject_strength", "STEM_STRONG"),
    effects: [
      { type: "add_curriculum", curriculum: "AP", delta: 6 },
      { type: "add_curriculum", curriculum: "IB", delta: -8 },
    ],
  },
  {
    id: "balanced",
    name: "学科均衡",
    description: "草案。各科比较齐时，IB 加得更多。",
    enabled: true,
    draft: true,
    when: eq("subject_strength", "BALANCED"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: 4 },
      { type: "add_curriculum", curriculum: "AP", delta: 4 },
      { type: "add_curriculum", curriculum: "IB", delta: 12, reasonCopyId: "reason_ib_balanced" },
    ],
  },
  {
    id: "arts",
    name: "人文艺术优势",
    description: "草案。人文或艺术更强时，略抬 AP 和 IB，略降 A-Level。",
    enabled: true,
    draft: true,
    when: eq("subject_strength", "ARTS_SPECIAL"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: -4 },
      { type: "add_curriculum", curriculum: "AP", delta: 8 },
      { type: "add_curriculum", curriculum: "IB", delta: 4 },
    ],
  },
  {
    id: "eng_a",
    name: "英语流利",
    description: "草案。体系分里的英语加分，和适合度里的英语分是两套。",
    enabled: true,
    draft: true,
    when: eq("english_level", "A"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: 6 },
      { type: "add_curriculum", curriculum: "AP", delta: 8 },
      { type: "add_curriculum", curriculum: "IB", delta: 10 },
    ],
  },
  {
    id: "eng_b",
    name: "英语中等",
    description: "草案。能看懂大意、细节要猜。",
    enabled: true,
    draft: true,
    when: eq("english_level", "B"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: 4 },
      { type: "add_curriculum", curriculum: "AP", delta: 6 },
      { type: "add_curriculum", curriculum: "IB", delta: 6 },
    ],
  },
  {
    id: "eng_c",
    name: "英语吃力",
    description: "草案。三条体系都减分，IB 减得最多。",
    enabled: true,
    draft: true,
    when: eq("english_level", "C"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: -8 },
      { type: "add_curriculum", curriculum: "AP", delta: -10 },
      { type: "add_curriculum", curriculum: "IB", delta: -16 },
    ],
  },
  {
    id: "mind_a",
    name: "探究主动",
    description: "草案。主动探究对 IB 加分更大。",
    enabled: true,
    draft: true,
    when: eq("mindset_exploration", "A"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: 2 },
      { type: "add_curriculum", curriculum: "AP", delta: 4 },
      { type: "add_curriculum", curriculum: "IB", delta: 8 },
    ],
  },
  {
    id: "mind_b",
    name: "探究中等",
    description: "草案。会做，但希望老师给步骤。",
    enabled: true,
    draft: true,
    when: eq("mindset_exploration", "B"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: 2 },
      { type: "add_curriculum", curriculum: "AP", delta: 2 },
      { type: "add_curriculum", curriculum: "IB", delta: 4 },
    ],
  },
  {
    id: "mind_c",
    name: "探究抗拒",
    description: "草案。只想要标准答案时，IB 扣得最多。",
    enabled: true,
    draft: true,
    when: eq("mindset_exploration", "C"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: -2 },
      { type: "add_curriculum", curriculum: "AP", delta: -6 },
      { type: "add_curriculum", curriculum: "IB", delta: -14 },
    ],
  },
  {
    id: "self_a",
    name: "自控强",
    description: "草案。自控强对 AP 和 IB 更重要。自控分值本身尚未标定。",
    enabled: true,
    draft: true,
    when: eq("self_control", "A"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: 4 },
      { type: "add_curriculum", curriculum: "AP", delta: 6 },
      { type: "add_curriculum", curriculum: "IB", delta: 4 },
    ],
  },
  {
    id: "self_c",
    name: "自控失控",
    description: "草案。深度依赖电子产品时，AP 扣得最多。",
    enabled: true,
    draft: true,
    when: eq("self_control", "C"),
    effects: [
      { type: "add_curriculum", curriculum: "A-Level", delta: -4 },
      { type: "add_curriculum", curriculum: "AP", delta: -14 },
      { type: "add_curriculum", curriculum: "IB", delta: -10 },
    ],
  },
  {
    id: "road_test",
    name: "路线图：标化摸底",
    description: "文档示例里的近三个月动作，对所有学生给出。",
    enabled: true,
    draft: false,
    when: always(),
    effects: [{ type: "roadmap", copyId: "roadmap_english_test" }],
  },
  {
    id: "road_exam",
    name: "路线图：校测准备",
    description: "文档示例里的半年内动作，对所有学生给出。",
    enabled: true,
    draft: false,
    when: always(),
    effects: [{ type: "roadmap", copyId: "roadmap_entrance" }],
  },
  {
    id: "road_j3",
    name: "路线图：初三学籍",
    description: "草案。只对初三显示，提醒先核对中考和公办国际部。",
    enabled: true,
    draft: true,
    when: eq("grade", "J3"),
    effects: [{ type: "roadmap", copyId: "roadmap_j3" }],
  },
  {
    id: "road_s1",
    name: "路线图：高一插班",
    description: "草案。只对准备插班的高一学生显示。",
    enabled: true,
    draft: true,
    when: eq("grade", "S1_transfer"),
    effects: [{ type: "roadmap", copyId: "roadmap_s1" }],
  },
  {
    id: "road_eng",
    name: "路线图：先补英语",
    description: "草案。英语吃力时，把衔接放在择校前面。",
    enabled: true,
    draft: true,
    when: eq("english_level", "C"),
    effects: [{ type: "roadmap", copyId: "roadmap_english_c" }],
  },
];

export function createDefaultConfig(): AlgorithmConfig {
  return {
    version: 1,
    status: "published",
    updatedAt: "",
    note: "初始配置。文档已写明的是四项权重、英语和探究分值、预算警示、英语且探究都吃力时扣 15 分、数理强则 A-Level 加 20、目标美国且自控未失控则 AP 加 25。其余分值、体系加分和 IB 封顶 65 都是草案，发布前请在试算里改。",
    fields: [
      {
        key: "grade",
        title: "年级",
        prompt: "学生现在在哪个阶段？",
        options: [
          { value: "J3", label: "初三", hint: "还没结束中考" },
          { value: "S1_regular", label: "高一，仍在体制内", hint: "还没有转入国际课程" },
          { value: "S1_transfer", label: "高一，准备插班或已在国际课程" },
        ],
      },
      {
        key: "shanghai_rank_tier",
        title: "上海排位",
        prompt: "在上海，最近一次统考或模考更接近哪一档？",
        options: [
          { value: "T1", label: "区前约 5%", hint: "四校、顶尖一层" },
          { value: "T2", label: "区前约 15%", hint: "八大、核心区重点" },
          { value: "T3", label: "区前约 30%", hint: "优质区重点" },
          { value: "T4", label: "区前约 30%–50%", hint: "普通普高" },
          { value: "T5", label: "普高线边缘", hint: "刚好在普高线附近" },
        ],
      },
      {
        key: "english_level",
        title: "英语",
        prompt: "如果现在读一页没有中文注释的英文说明，更接近哪种？",
        options: [
          { value: "A", label: "基本无压力，偶尔查词" },
          { value: "B", label: "能看懂大意，细节要猜" },
          { value: "C", label: "大段读下来吃力，要逐句翻译" },
        ],
      },
      {
        key: "mindset_exploration",
        title: "探究思维",
        prompt: "老师布置一项没有标准答案、要自己找资料完成的长作业。第一反应更接近？",
        options: [
          { value: "A", label: "觉得有挑战，愿意自己搭框架" },
          { value: "B", label: "会做，但希望老师给步骤" },
          { value: "C", label: "感到焦虑，只想要标准答案" },
        ],
      },
      {
        key: "self_control",
        title: "自控",
        prompt: "没有人盯着的时候，手机和电脑通常是什么情况？",
        options: [
          { value: "A", label: "能自己停下来", hint: "学习时段很少被打断" },
          { value: "B", label: "偶尔刷很久", hint: "提醒后能回来" },
          { value: "C", label: "一拿起来就停不住", hint: "作业经常被打断" },
        ],
      },
      {
        key: "subject_strength",
        title: "学科优势",
        prompt: "学科结构更接近哪一种？",
        options: [
          { value: "STEM_STRONG", label: "数学和理科明显强", hint: "文科写作一般" },
          { value: "BALANCED", label: "各科比较齐", hint: "没有特别拖后的一门" },
          { value: "ARTS_SPECIAL", label: "人文、语言或艺术更强", hint: "数理不是长板" },
        ],
      },
      {
        key: "target_country",
        title: "目标国家",
        prompt: "目前家里更倾向哪个升学方向？",
        options: [
          { value: "US", label: "美国" },
          { value: "UK_HK_SG", label: "英国、香港或新加坡" },
          { value: "CA_AU", label: "加拿大或澳洲" },
          { value: "UNDECIDED", label: "还不确定", hint: "可以先不定国家" },
        ],
      },
      {
        key: "budget_tier",
        title: "学费预算",
        prompt: "国际高中每年学费，家庭可以接受的范围是？",
        options: [
          { value: "B1_LOW", label: "每年 15 万以下" },
          { value: "B2_MID", label: "每年 15–25 万" },
          { value: "B3_HIGH", label: "每年 25–40 万" },
          { value: "B4_LUXURY", label: "每年 40 万以上" },
        ],
      },
      {
        key: "parent_psychology",
        title: "家长心态",
        prompt: "家长对离开高考主路径这件事，现在是什么状态？",
        options: [
          { value: "READY", label: "已经讨论过，可以接受" },
          { value: "HESITANT", label: "还在犹豫，希望保留退路" },
        ],
      },
    ],
    scoreMaps: {
      english_level: { calibrated: true, scores: { A: 100, B: 70, C: 30 } },
      mindset_exploration: { calibrated: true, scores: { A: 100, B: 65, C: 30 } },
      self_control: { calibrated: false, scores: { A: 100, B: 65, C: 30 } },
      target_country: {
        calibrated: false,
        scores: { US: 100, UK_HK_SG: 100, CA_AU: 100, UNDECIDED: 60 },
      },
      budget_tier: {
        calibrated: false,
        scores: { B1_LOW: 40, B2_MID: 75, B3_HIGH: 90, B4_LUXURY: 100 },
      },
      parent_psychology: { calibrated: false, scores: { READY: 100, HESITANT: 60 } },
    },
    fit: {
      dimensions: [
        {
          id: "academic",
          label: "学业基底",
          weight: 0.3,
          note: "文档给出了英语分值，没有给出学科优势的好坏分数。学科优势只进入体系加分，不进适合度。",
          parts: [{ source: "english_level", weight: 1 }],
        },
        {
          id: "autonomy",
          label: "自主与自控",
          weight: 0.25,
          note: "探究分值来自文档。自控分值是未标定草案，暂时与探究使用同一套 100 / 65 / 30。",
          parts: [
            { source: "mindset_exploration", weight: 0.5 },
            { source: "self_control", weight: 0.5 },
          ],
        },
        {
          id: "clarity",
          label: "升学明确度",
          weight: 0.25,
          note: "已选任何国家都视为明确，不在适合度里区分哪个国家更好。国家差异放在体系加分。",
          parts: [{ source: "target_country", weight: 1 }],
        },
        {
          id: "family",
          label: "家庭保障",
          weight: 0.2,
          note: "预算和家长心态的分值、6:4 的内部权重都是草案。预算低于 15 万的警示是单独规则。",
          parts: [
            { source: "budget_tier", weight: 0.6 },
            { source: "parent_psychology", weight: 0.4 },
          ],
        },
      ],
      bands: [
        {
          min: 80,
          label: "可以准备转轨",
          summary: "学业、自控和家庭条件整体够用，可以开始做衔接和择校准备。分数高仍然不等于现在就要放弃学籍。",
        },
        {
          min: 60,
          label: "有条件适合",
          summary: "有一条走得通的路径，但至少有一项短板需要先补上，再决定是否直接入读。",
        },
        {
          min: 0,
          label: "暂不建议直接入读",
          summary: "以目前的语言、自控或预算，直接进入全日制国际高中风险偏高。先补短板，再重新评估。",
        },
      ],
    },
    curricula: [
      { id: "A-Level", name: "A-Level", base: 50 },
      { id: "AP", name: "AP", base: 50 },
      { id: "IB", name: "IB", base: 50 },
    ],
    rules: structuredClone(rules),
    domesticAnchor: {
      T1: {
        label: "区前约 5%",
        equivalent: "若留在上海体制内，常见参照是顶尖 985，例如复旦大学、上海交通大学。全国参照仍是清北复交。这是路径对照，不是录取预测。",
        qsBand: "同一档的国际举例落在 QS 前 10，以及前 30。",
        abroad: {
          US: "美国前 10 例如麻省理工学院、斯坦福大学、哈佛大学；前 30 例如加州大学伯克利分校、哥伦比亚大学、宾夕法尼亚大学。",
          UK_HK_SG: "英国前 10 例如牛津大学、剑桥大学、帝国理工学院；前 30 例如伦敦大学学院、爱丁堡大学。香港例如香港大学、香港中文大学、香港科技大学。新加坡例如新加坡国立大学、南洋理工大学。",
          CA_AU: "加拿大这一档没有常年稳在前 10 的综合大学，前 30 例如多伦多大学、麦吉尔大学、英属哥伦比亚大学。澳大利亚例如墨尔本大学、悉尼大学、新南威尔士大学、澳大利亚国立大学。",
          UNDECIDED: "方向还没定，先看上面的国内举例。国际只标到 QS 前 10 和前 30，不定具体学校。",
        },
      },
      T2: {
        label: "区前约 15%",
        equivalent: "若留在上海体制内，常见参照是稳上 985 或强 211，例如同济大学、华东师范大学、上海财经大学、华东理工大学。这是路径对照，不是录取预测。",
        qsBand: "同一档的国际举例落在 QS 前 30。",
        abroad: {
          US: "美国例如加州大学伯克利分校、哥伦比亚大学、宾夕法尼亚大学。",
          UK_HK_SG: "英国例如爱丁堡大学、伦敦大学学院。香港例如香港大学、香港中文大学、香港科技大学。新加坡例如新加坡国立大学、南洋理工大学。",
          CA_AU: "加拿大例如多伦多大学、麦吉尔大学、英属哥伦比亚大学。澳大利亚例如墨尔本大学、悉尼大学、新南威尔士大学、澳大利亚国立大学。",
          UNDECIDED: "方向还没定，先看上面的国内举例。国际只标到 QS 前 30，不定具体学校。",
        },
      },
      T3: {
        label: "区前约 30%",
        equivalent: "若留在上海体制内，常见参照是 211 或一本双一流，例如上海大学、东华大学、上海外国语大学。这是路径对照，不是录取预测。",
        qsBand: "同一档的国际举例落在 QS 前 50。",
        abroad: {
          US: "美国例如纽约大学、加州大学圣地亚哥分校、伊利诺伊大学香槟分校。",
          UK_HK_SG: "英国例如曼彻斯特大学、布里斯托大学、华威大学。香港例如香港城市大学、香港理工大学。新加坡没有稳定落在这一档的综合大学。",
          CA_AU: "加拿大例如麦克马斯特大学。澳大利亚例如昆士兰大学、蒙纳士大学。",
          UNDECIDED: "方向还没定，先看上面的国内举例。国际只标到 QS 前 50，不定具体学校。",
        },
      },
      T4: {
        label: "区前约 30%–50%",
        equivalent: "若留在上海体制内，常见参照是普通本科，例如上海理工大学、上海师范大学、上海海事大学。这是路径对照，不是录取预测。",
        qsBand: "同一档的国际举例落在 QS 前 100。",
        abroad: {
          US: "美国例如普渡大学、威斯康星大学麦迪逊分校、波士顿大学。",
          UK_HK_SG: "英国例如格拉斯哥大学、伯明翰大学、南安普顿大学。香港和新加坡没有稳定落在这一档的综合大学。",
          CA_AU: "加拿大例如阿尔伯塔大学、蒙特利尔大学。澳大利亚例如西澳大学、阿德莱德大学。",
          UNDECIDED: "方向还没定，先看上面的国内举例。国际只标到 QS 前 100，不定具体学校。",
        },
      },
      T5: {
        label: "普高线边缘",
        equivalent: "若留在上海体制内，常见参照是专科到民办本科，例如上海杉达学院、上海建桥学院，以及上海的公办专科。这是路径对照，不是录取预测。",
        qsBand: "这一档不放进 QS 前 10、前 30、前 50 或前 100。",
        abroad: {
          US: "国际路线不按这四档举例。",
          UK_HK_SG: "国际路线不按这四档举例。",
          CA_AU: "国际路线不按这四档举例。",
          UNDECIDED: "国际路线不按这四档举例。",
        },
      },
    },
    copy: {
      budget_limited: "预算受限，建议优先考虑公办高中国际部或普惠型民办，高收费贵族学校不予匹配。",
      english_bridge: "需先进行半到一年英语高强度衔接，否则直接入读国际高中面临 GPA 崩塌风险。",
      ib_pressure: "论文与英文输出压力大。英语和探究没有同时达到最主动的一档，IB 不宜作为主推荐。",
      reason_alevel_stem: "数理优势明显，A-Level 可以集中在少数擅长科目，避开短板。",
      reason_alevel_uk: "英国、香港或新加坡方向，和 A-Level 的升学路径更直接。",
      reason_ap_us: "目标是美国，而且自控还没有失控，更承受得住成绩、标化和活动并行。",
      reason_ib_ready: "英语和探究都主动，相对接得住 IB 的论文和全英文输出。",
      reason_ib_capped: "英语和探究没有同时达到最主动的一档，IB 被门槛压低。",
      reason_ib_balanced: "学科比较均衡，更接近 IB 六门都要照顾的结构。",
      reason_ib_country: "目标国家还没定，IB 的升学去向更宽。",
      roadmap_english_test: "近 3 个月：做一次托福或小托福模考，看清词汇和学术英语的起跑线。",
      roadmap_entrance: "半年内：按目标学校的英文笔试、数学和面试做专项准备。",
      roadmap_j3: "初三这一年：先核对中考和公办国际部的入学条件，再决定要不要放弃学籍。",
      roadmap_s1: "高一插班：先确认衔接年级和学分怎么算，不要直接插进最重的主课。",
      roadmap_english_c: "英语仍然吃力时，先把衔接放在择校前面，不要同时硬读主课。",
    },
  };
}
