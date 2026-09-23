import { api } from "@/lib/api/client";
import type { HomeItem, HomeResponse, HomeSlotId } from "./types";

const HOME_PATH = "/api/home";

export const homeApi = {
  get: (signal?: AbortSignal) => api.get<HomeResponse>(HOME_PATH, signal),
  place: (topicId: number, slotId: HomeSlotId, signal?: AbortSignal) =>
    api.put<HomeItem>(
      `${HOME_PATH}/items/${topicId}/placement`,
      { slotId },
      signal,
    ),
  store: (topicId: number, signal?: AbortSignal) =>
    api.delete<void>(`${HOME_PATH}/items/${topicId}/placement`, undefined, signal),
};

export const topicApi = {
  /** 話題の公開/非公開を切り替える。 */
  updateVisibility: (topicId: number, publicTopic: boolean, signal?: AbortSignal) =>
    api.patch<HomeItem>(`/api/topics/${topicId}`, { publicTopic }, signal),
  /** 話題を物理削除する。家に配置済みなら配置も一緒に消える。 */
  remove: (topicId: number, signal?: AbortSignal) =>
    api.delete<void>(`/api/topics/${topicId}`, undefined, signal),
};
