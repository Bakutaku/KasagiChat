/** NPC(分身)APIの呼び出し。CSRFやエラー変換は @/lib/api/client が担当する。 */

import { ApiError, api } from "@/lib/api/client";
import type { CreateNpcRequest, Npc } from "./types";

const NPC_PATH = "/api/npc";

export const npcApi = {
  /** 本人のNPCを取得する。未作成のときは 404 NPC_NOT_FOUND。 */
  get: (signal?: AbortSignal) => api.get<Npc>(NPC_PATH, signal),

  /**
   * 未作成(404)を正常系として null で返す版。
   * 「NPCがいなければ作成画面へ」という分岐に使う。
   * 404以外のエラーと、他のAPIが返す404を取り違えないためのラッパー。
   */
  find: async (signal?: AbortSignal): Promise<Npc | null> => {
    try {
      return await api.get<Npc>(NPC_PATH, signal);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /** 誕生前のNPCを1体作成する。AI利用設定が未完了なら拒否される。 */
  create: (body: CreateNpcRequest, signal?: AbortSignal) =>
    api.post<Npc>(NPC_PATH, body, signal),
};
