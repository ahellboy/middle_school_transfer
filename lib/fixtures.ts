import type { Profile } from "./types";

export type Fixture = {
  id: string;
  name: string;
  blurb: string;
  profile: Profile;
};

export const fixtures: Fixture[] = [
  {
    id: "stem",
    name: "数理强、英语中等",
    blurb: "区前约 15%，目标英港新，预算够用。",
    profile: {
      grade: "J3",
      shanghai_rank_tier: "T2",
      english_level: "B",
      mindset_exploration: "B",
      self_control: "B",
      target_country: "UK_HK_SG",
      subject_strength: "STEM_STRONG",
      budget_tier: "B3_HIGH",
      parent_psychology: "READY",
    },
  },
  {
    id: "allround",
    name: "英语流利、学科均衡",
    blurb: "区前约 5%，目标美国，探究和自控都强。",
    profile: {
      grade: "J3",
      shanghai_rank_tier: "T1",
      english_level: "A",
      mindset_exploration: "A",
      self_control: "A",
      target_country: "US",
      subject_strength: "BALANCED",
      budget_tier: "B4_LUXURY",
      parent_psychology: "READY",
    },
  },
  {
    id: "budget",
    name: "预算有限、英语吃力",
    blurb: "普高线边缘，学费每年 15 万以下。",
    profile: {
      grade: "S1_regular",
      shanghai_rank_tier: "T5",
      english_level: "C",
      mindset_exploration: "C",
      self_control: "C",
      target_country: "UNDECIDED",
      subject_strength: "ARTS_SPECIAL",
      budget_tier: "B1_LOW",
      parent_psychology: "HESITANT",
    },
  },
];
