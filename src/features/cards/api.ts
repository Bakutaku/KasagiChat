import { api } from "@/lib/api/client";
import type { Card } from "./types";

const EVENTS_PATH = "/api/events";
const CARDS_PATH = "/api/cards";

export const cardApi = {
  listByEvent: async (eventId: string, signal?: AbortSignal): Promise<Card[]> =>
    // 本文なし・非JSONのときクライアントは undefined を返すため、空配列へ寄せる。
    (await api.get<Card[] | undefined>(
      `${EVENTS_PATH}/${eventId}/cards`,
      signal,
    )) ?? [],
  listAll: async (signal?: AbortSignal): Promise<Card[]> =>
    (await api.get<Card[] | undefined>(CARDS_PATH, signal)) ?? [],
  get: (cardId: string, signal?: AbortSignal) =>
    api.get<Card>(`${CARDS_PATH}/${cardId}`, signal),
  open: (cardId: string, signal?: AbortSignal) =>
    api.post<Card>(`${CARDS_PATH}/${cardId}/open`, undefined, signal),
};
