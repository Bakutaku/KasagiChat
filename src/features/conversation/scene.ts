/**
 * 練習シーンの定義と、街のスポットとの対応。
 *
 * ここは純粋なデータと関数だけを置きます(tests/conversation.test.mjs から
 * 直接読み込むため、@/ エイリアスや React への依存を持ち込まないでください)。
 *
 * 会話相手はシーン専用のNPCで、分身は同行して見守るだけです(requirements 3-3)。
 * 相手の見た目はシステムプリセットを使い、ロビーと面接は同じ立ち絵を共有します。
 * 名前と背景でシーンを区別しているため、絵の共有は成立します。
 * 専用の素材が用意できたら partnerPresetId を差し替えるだけで切り替わります。
 */

import type { ConversationBackgroundKey } from "./presentation";
import type { ConversationScene } from "./types";

export type PracticeSceneKey = "CAFE" | "LOBBY" | "OFFICE";

export type PracticeSceneDefinition = {
  /** hoshikawa-town.json のスポットID。 */
  spotId: string;
  /** 会話シェルの背景キー。 */
  backgroundKey: ConversationBackgroundKey;
  /** 一覧などに出す短いラベル。 */
  label: string;
  /** 会話相手の表示名。 */
  partnerName: string;
  /** 会話相手の見た目(システムプリセットID)。 */
  partnerPresetId: string;
  /** 会話画面の見出し。 */
  title: string;
};

export const PRACTICE_SCENES: Record<PracticeSceneKey, PracticeSceneDefinition> = {
  CAFE: {
    spotId: "cafe",
    backgroundKey: "cafe",
    label: "カフェ",
    partnerName: "カフェ店員",
    partnerPresetId: "cafe-server",
    title: "カフェで雑談の練習",
  },
  LOBBY: {
    spotId: "lobby",
    backgroundKey: "lobby",
    label: "ロビー",
    partnerName: "初対面の人",
    partnerPresetId: "suited-guide",
    title: "ロビーで初対面の練習",
  },
  OFFICE: {
    spotId: "office",
    backgroundKey: "office",
    label: "オフィス",
    partnerName: "面接官",
    partnerPresetId: "suited-guide",
    title: "オフィスで面接の練習",
  },
};

const SCENE_BY_SPOT_ID: Record<string, PracticeSceneKey> = Object.fromEntries(
  Object.entries(PRACTICE_SCENES).map(([scene, definition]) => [
    definition.spotId,
    scene as PracticeSceneKey,
  ]),
);

/**
 * 街のスポットIDに対応する練習シーンを返す。
 * 練習シーンではないスポット(家・広場)では null を返す。
 */
export function sceneForSpotId(spotId: string): PracticeSceneKey | null {
  return SCENE_BY_SPOT_ID[spotId] ?? null;
}

/** 会話一覧などで種別とシーンを1つのラベルにする。 */
export function conversationLabel(
  type: "BIRTH" | "PRACTICE" | "DAILY",
  scene: ConversationScene,
): string {
  if (type === "BIRTH") {
    return "最初の会話";
  }
  if (type === "DAILY") {
    return "今日のひとこと";
  }
  return scene ? `練習・${PRACTICE_SCENES[scene].label}` : "練習";
}
