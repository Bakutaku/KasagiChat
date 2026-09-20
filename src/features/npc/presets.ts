import type { NpcPreset } from "./types";

/**
 * 選択可能な見た目のプリセット。
 * 現行バックエンドはIDを固定一覧で検証していない(文字列長のみ)ため、
 * ここが実質の正となる。画像は /public/assets/npc/presets/{id}.png。
 */
export const NPC_PRESETS: readonly NpcPreset[] = [
  {
    id: "friendly-student",
    name: "親しみやすい学生",
    description: "やわらかな笑顔で、自然に話しかけてくれそう",
  },
  {
    id: "quiet-boy",
    name: "おだやかな男の子",
    description: "静かな雰囲気で、話をじっくり聞いてくれそう",
  },
  {
    id: "cheerful-girl",
    name: "元気な女の子",
    description: "明るい表情で、会話の一歩を応援してくれそう",
  },
  {
    id: "cool-girl",
    name: "クールな女の子",
    description: "落ち着いた佇まいで、率直に向き合ってくれそう",
  },
  {
    id: "stylish-man",
    name: "スタイリッシュな青年",
    description: "余裕のある雰囲気で、気軽に導いてくれそう",
  },
] as const;

/**
 * NPCのシステムプリセット。ユーザーが選べるプリセットではなく、会話の演出などで使う。
 */
export const NPC_SYSTEM_PRESETS: readonly NpcPreset[] = [
  {
    id: "suited-guide",
    name: "スーツの案内人",
    description: "知的で穏やかに、考えを整理してくれそう",
  },
  {
    id: "cafe-server",
    name: "カフェスタッフ",
    description: "あたたかな空気で、会話をほぐしてくれそう",
  },
] as const;

export const DEFAULT_PRESET_ID = NPC_PRESETS[0].id;

const ALL_PRESET = [...NPC_PRESETS, ...NPC_SYSTEM_PRESETS] as const;

/** プリセットIDから画像パスを返す。未知のIDなら先頭プリセットにフォールバックする。 */
export function presetImagePath(presetId: string) {
  const preset = ALL_PRESET.find((item) => item.id === presetId);
  return `/assets/npc/presets/${preset?.id || DEFAULT_PRESET_ID}.png`;
}
