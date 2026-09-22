import type { MapTargetDetails, RuntimeMapCharacter } from "../../components/map/map-types";
import { PRACTICE_SCENES, sceneForSpotId, type PracticeSceneKey } from "../conversation/scene";
import { presetImagePath } from "../npc/presets";

/** 会話シーンと地図をつなぐ表示専用アダプター。API・参加者の状態を保存しません。 */
const practiceDetails: Record<PracticeSceneKey, { description: string; status: string; column: number; row: number }> = {
  CAFE: { description: "好きなものや今日の出来事から、気軽なおしゃべりを。", status: "雑談の練習", column: 2.1, row: 7.5 },
  LOBBY: { description: "あいさつや自己紹介から、初めての人との一歩を。", status: "初対面の練習", column: 3, row: 2.1 },
  OFFICE: { description: "自分の経験や思いを、落ち着いて伝えてみましょう。", status: "面接の練習", column: 8.2, row: 2.1 },
};

export type TownVisit = MapTargetDetails & {
  name: string;
  place: string;
  imageSrc?: string;
  scene: PracticeSceneKey | null;
  destination?: "/home" | "/events";
};

export function townVisit(spotId: string): TownVisit | null {
  const scene = sceneForSpotId(spotId);
  if (scene) {
    const definition = PRACTICE_SCENES[scene];
    return {
      name: definition.partnerName,
      place: definition.label,
      imageSrc: presetImagePath(definition.partnerPresetId),
      scene,
      description: practiceDetails[scene].description,
      status: practiceDetails[scene].status,
      actionLabel: "会話をはじめる",
    };
  }
  if (spotId === "home") return {
    name: "家", place: "星川の街", scene: null, destination: "/home",
    description: "分身とひと息。思い出の品を眺めたり、今日のひとことを話したり。",
    status: "分身と過ごす場所", actionLabel: "家へ帰る",
  };
  if (spotId === "plaza") return {
    name: "広場", place: "星川の街", scene: null,
    destination: "/events",
    description: "花と噴水に囲まれた、街の小さな憩いの場所。イベントの入口を兼ねています。",
    status: "イベントの入口", actionLabel: "イベント一覧を見る",
  };
  return null;
}

/** システムの練習相手だけを画面から供給。個人の分身やイベント参加者の代用ではありません。 */
export const townCharacters: readonly RuntimeMapCharacter[] = Object.entries(PRACTICE_SCENES).map(([key, scene]) => {
  const details = practiceDetails[key as PracticeSceneKey];
  return {
    id: scene.spotId, name: scene.partnerName, src: presetImagePath(scene.partnerPresetId),
    column: details.column, row: details.row,
    details: { description: details.description, status: details.status, actionLabel: "選択して会話の案内を見る" },
  };
});

export const townSpotDetails: Readonly<Record<string, MapTargetDetails>> = Object.fromEntries(
  ["cafe", "lobby", "office", "home", "plaza"].map((id) => {
    const visit = townVisit(id)!;
    return [id, {
      description: visit.scene ? `${visit.name}と、${visit.description}` : visit.description,
      status: visit.status,
      actionLabel: visit.scene ? "選択して会話の案内を見る" : "選択して詳しく見る",
    }];
  }),
);
