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
