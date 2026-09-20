/** NPC(分身)APIの型定義。GET/POST /api/npc のレスポンスをそのまま写している。 */

export type Npc = {
  name: string;
  presetId: string;
  level: number;
  exp: number;
  profile: string | null;
  speechStyle: string | null;
  speechStyleEnabled: boolean;
  /** 誕生済みなら日時が入る。null なら誕生オンボーディングの途中。 */
  bornAt: string | null;
};

export type CreateNpcRequest = {
  presetId: string;
  name: string;
};

/** 選択できる見た目。画像は /public/assets/npc/presets/{id}.png に対応する。 */
export type NpcPreset = {
  id: string;
  name: string;
  description: string;
};
