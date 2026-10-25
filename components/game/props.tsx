import type { ReactNode } from "react";

const G = "#2f9a4a";
const D = "#1f6b3a";
const C = "#f7f3e8";
const GOLD = "#e0b15a";

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 80 80" className="prop-art" aria-hidden="true">
      {children}
    </svg>
  );
}

function Backpack() {
  return (
    <Frame>
      <rect x="22" y="28" width="36" height="38" rx="8" fill={G} />
      <rect x="30" y="38" width="20" height="14" rx="3" fill={C} />
      <path d="M30 30c0-10 20-10 20 0" fill="none" stroke={D} strokeWidth="4" />
      <path d="M26 36c-6 2-8 10-6 16M54 36c6 2 8 10 6 16" fill="none" stroke={D} strokeWidth="3" />
    </Frame>
  );
}

function Shirt() {
  return (
    <Frame>
      <path d="M30 22h20l10 12-8 6v24H28V40l-8-6z" fill={G} />
      <path d="M30 22c3 10 17 10 20 0" fill={C} />
      <path d="M36 48h8" stroke={C} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

function Suitcase() {
  return (
    <Frame>
      <rect x="18" y="30" width="44" height="32" rx="6" fill={C} stroke={G} strokeWidth="3" />
      <path d="M32 30v-6h16v6" fill="none" stroke={D} strokeWidth="3" />
      <rect x="38" y="40" width="4" height="12" rx="2" fill={G} />
    </Frame>
  );
}

function Stack({ n }: { n: number }) {
  const sheets = [];
  for (let i = 0; i < n; i += 1) {
    sheets.push(
      <rect key={i} x={16 + i} y={62 - i * 9} width={46 - i} height="11" rx="2" fill={i % 2 ? "#fff" : C} stroke={G} strokeWidth="2" />,
    );
  }
  return <Frame>{sheets}</Frame>;
}

function OpenBook() {
  return (
    <Frame>
      <path d="M12 24h24c4 8 4 28 0 36H12z" fill="#fff" stroke={G} strokeWidth="3" />
      <path d="M68 24H44c-4 8-4 28 0 36h24z" fill={C} stroke={G} strokeWidth="3" />
      <path d="M18 34h12M18 42h12M46 34h12M46 42h12" stroke={D} strokeWidth="2" />
    </Frame>
  );
}

function Magnifier() {
  return (
    <Frame>
      <circle cx="34" cy="34" r="16" fill={C} stroke={G} strokeWidth="6" />
      <path d="M46 46 64 64" stroke={D} strokeWidth="6" strokeLinecap="round" />
    </Frame>
  );
}

function Dictionary() {
  return (
    <Frame>
      <rect x="22" y="16" width="36" height="50" rx="4" fill={G} />
      <rect x="28" y="16" width="6" height="50" fill={C} />
      <path d="M40 32h12M40 40h12M40 48h8" stroke="#fff" strokeWidth="2" />
    </Frame>
  );
}

function BlankSheet() {
  return (
    <Frame>
      <rect x="20" y="14" width="40" height="52" rx="4" fill="#fff" stroke={G} strokeWidth="3" />
    </Frame>
  );
}

function Checklist() {
  return (
    <Frame>
      <rect x="20" y="14" width="40" height="52" rx="4" fill="#fff" stroke={G} strokeWidth="3" />
      <circle cx="30" cy="30" r="3" fill={G} />
      <circle cx="30" cy="42" r="3" fill={G} />
      <circle cx="30" cy="54" r="3" fill={G} />
      <path d="M38 30h14M38 42h14M38 54h14" stroke={D} strokeWidth="2" />
    </Frame>
  );
}

function AnswerSheet() {
  return (
    <Frame>
      <rect x="20" y="14" width="40" height="52" rx="4" fill="#fff" stroke={G} strokeWidth="3" />
      <path d="M28 32h24M28 40h24M28 48h16" stroke={D} strokeWidth="2" />
      <circle cx="52" cy="52" r="8" fill="none" stroke={GOLD} strokeWidth="3" />
    </Frame>
  );
}

function Phone({ mode }: { mode: "down" | "dim" | "bright" }) {
  const screen = mode === "down" ? D : mode === "dim" ? "#b7d7c0" : "#e7ffc4";
  return (
    <Frame>
      <rect x="26" y="12" width="28" height="54" rx="6" fill={mode === "down" ? D : G} />
      <rect x="30" y="18" width="20" height="38" rx="2" fill={screen} />
      {mode === "bright" ? <circle cx="40" cy="36" r="5" fill="#fff" /> : null}
    </Frame>
  );
}

function StemKit() {
  return (
    <Frame>
      <circle cx="28" cy="46" r="14" fill="none" stroke={G} strokeWidth="4" />
      <path d="M28 32v28M16 46h24" stroke={G} strokeWidth="2" />
      <rect x="42" y="28" width="22" height="30" rx="3" fill={D} />
      <rect x="46" y="34" width="6" height="4" fill={C} />
      <rect x="54" y="34" width="6" height="4" fill={C} />
      <rect x="46" y="42" width="6" height="4" fill={GOLD} />
      <rect x="54" y="42" width="6" height="4" fill={C} />
    </Frame>
  );
}

function Textbooks() {
  return (
    <Frame>
      <rect x="14" y="22" width="14" height="40" rx="2" fill={G} />
      <rect x="32" y="18" width="14" height="44" rx="2" fill={D} />
      <rect x="50" y="26" width="14" height="36" rx="2" fill="#67b56a" />
    </Frame>
  );
}

function BrushBook() {
  return (
    <Frame>
      <rect x="14" y="24" width="28" height="36" rx="3" fill={C} stroke={G} strokeWidth="3" />
      <path d="M48 18c8 2 12 14 8 24l-6 16h-6l4-16c2-6-2-12 0-24z" fill={GOLD} />
      <rect x="42" y="56" width="14" height="6" rx="2" fill={D} />
    </Frame>
  );
}

function Postcard({ mark }: { mark: "star" | "arch" | "leaf" | "blank" }) {
  return (
    <Frame>
      <rect x="12" y="22" width="56" height="38" rx="4" fill={C} stroke={G} strokeWidth="3" />
      {mark === "star" ? <path d="M32 32l2 6h6l-5 4 2 6-5-3-5 3 2-6-5-4h6z" fill={GOLD} /> : null}
      {mark === "arch" ? <path d="M28 50V36a8 8 0 0 1 16 0v14" fill="none" stroke={D} strokeWidth="3" /> : null}
      {mark === "leaf" ? <ellipse cx="40" cy="40" rx="8" ry="12" fill={G} transform="rotate(-30 40 40)" /> : null}
    </Frame>
  );
}

function Envelope({ thick }: { thick: number }) {
  const h = 18 + thick * 6;
  const y = 58 - h;
  return (
    <Frame>
      <rect x="16" y={y} width="48" height={h} rx="3" fill={C} stroke={G} strokeWidth="3" />
      <path d={`M16 ${y + 4} L40 ${y + h / 2} L64 ${y + 4}`} fill="none" stroke={D} strokeWidth="2" />
    </Frame>
  );
}

function Teas() {
  return (
    <Frame>
      <path d="M16 36h18l-2 16a8 8 0 0 1-8 6h0a8 8 0 0 1-8-6z" fill={C} stroke={G} strokeWidth="3" />
      <path d="M44 36h18l-2 16a8 8 0 0 1-8 6h0a8 8 0 0 1-8-6z" fill={C} stroke={G} strokeWidth="3" />
      <path d="M22 30c2-8 8-8 8 0M50 28c2-8 8-8 8 0" fill="none" stroke={D} strokeWidth="2" />
    </Frame>
  );
}

function Letter() {
  return (
    <Frame>
      <rect x="16" y="24" width="48" height="34" rx="3" fill={C} stroke={G} strokeWidth="3" />
      <path d="M16 28l24 16 24-16" fill="none" stroke={D} strokeWidth="2" />
      <circle cx="56" cy="48" r="6" fill={GOLD} />
    </Frame>
  );
}

function Blob() {
  return (
    <Frame>
      <circle cx="40" cy="40" r="18" fill={C} stroke={G} strokeWidth="4" />
    </Frame>
  );
}

const arts: Record<string, () => ReactNode> = {
  backpack: Backpack,
  shirt: Shirt,
  suitcase: Suitcase,
  stack5: () => <Stack n={5} />,
  stack4: () => <Stack n={4} />,
  stack3: () => <Stack n={3} />,
  stack2: () => <Stack n={2} />,
  stack1: () => <Stack n={1} />,
  book: OpenBook,
  glass: Magnifier,
  dictionary: Dictionary,
  blank: BlankSheet,
  list: Checklist,
  answer: AnswerSheet,
  phoneDown: () => <Phone mode="down" />,
  phoneDim: () => <Phone mode="dim" />,
  phoneBright: () => <Phone mode="bright" />,
  stem: StemKit,
  books: Textbooks,
  brush: BrushBook,
  cardStar: () => <Postcard mark="star" />,
  cardArch: () => <Postcard mark="arch" />,
  cardLeaf: () => <Postcard mark="leaf" />,
  cardBlank: () => <Postcard mark="blank" />,
  env1: () => <Envelope thick={1} />,
  env2: () => <Envelope thick={2} />,
  env3: () => <Envelope thick={3} />,
  env4: () => <Envelope thick={4} />,
  teas: Teas,
  letter: Letter,
  blob: Blob,
};

const shelfName: Record<string, string> = {
  grade: "backpack",
  shanghai_rank_tier: "stack3",
  english_level: "book",
  mindset_exploration: "blank",
  self_control: "phoneDim",
  subject_strength: "stem",
  target_country: "cardStar",
  budget_tier: "env2",
  parent_psychology: "teas",
};

const answerName: Record<string, string> = {
  "grade:J3": "backpack",
  "grade:S1_regular": "shirt",
  "grade:S1_transfer": "suitcase",
  "shanghai_rank_tier:T1": "stack5",
  "shanghai_rank_tier:T2": "stack4",
  "shanghai_rank_tier:T3": "stack3",
  "shanghai_rank_tier:T4": "stack2",
  "shanghai_rank_tier:T5": "stack1",
  "english_level:A": "book",
  "english_level:B": "glass",
  "english_level:C": "dictionary",
  "mindset_exploration:A": "blank",
  "mindset_exploration:B": "list",
  "mindset_exploration:C": "answer",
  "self_control:A": "phoneDown",
  "self_control:B": "phoneDim",
  "self_control:C": "phoneBright",
  "subject_strength:STEM_STRONG": "stem",
  "subject_strength:BALANCED": "books",
  "subject_strength:ARTS_SPECIAL": "brush",
  "target_country:US": "cardStar",
  "target_country:UK_HK_SG": "cardArch",
  "target_country:CA_AU": "cardLeaf",
  "target_country:UNDECIDED": "cardBlank",
  "budget_tier:B1_LOW": "env1",
  "budget_tier:B2_MID": "env2",
  "budget_tier:B3_HIGH": "env3",
  "budget_tier:B4_LUXURY": "env4",
  "parent_psychology:READY": "teas",
  "parent_psychology:HESITANT": "letter",
};

export function PropArt({ name }: { name: string }) {
  const Draw = arts[name] ?? arts.blob;
  return <>{Draw()}</>;
}

export function shelfArtName(fieldKey: string) {
  return shelfName[fieldKey] ?? "blob";
}

export function answerArtName(fieldKey: string, value: string) {
  return answerName[`${fieldKey}:${value}`] ?? "blob";
}

export function Bear() {
  return <img className="bear" src="/bear.png" alt="熊老师" />;
}
