import { api } from "@/lib/api/client";
import type {
  CreateEventInput,
  EventParticipant,
  Invitation,
  KasagiEvent,
} from "./types";

const EVENTS_PATH = "/api/events";
const INVITATIONS_PATH = "/api/invitations";

export const eventApi = {
  list: async (signal?: AbortSignal): Promise<KasagiEvent[]> =>
    // 本文なし・非JSONのときクライアントは undefined を返すため、空配列へ寄せる。
    (await api.get<KasagiEvent[] | undefined>(EVENTS_PATH, signal)) ?? [],
  get: (eventId: string, signal?: AbortSignal) =>
    api.get<KasagiEvent>(`${EVENTS_PATH}/${eventId}`, signal),
  participants: async (
    eventId: string,
    signal?: AbortSignal,
  ): Promise<EventParticipant[]> =>
    (await api.get<EventParticipant[] | undefined>(
      `${EVENTS_PATH}/${eventId}/participants`,
      signal,
    )) ?? [],
  create: (input: CreateEventInput, signal?: AbortSignal) =>
    api.post<KasagiEvent>(EVENTS_PATH, input, signal),
  leave: (eventId: string, signal?: AbortSignal) =>
    api.delete<void>(
      `${EVENTS_PATH}/${eventId}/participants/me`,
      undefined,
      signal,
    ),
  remove: (eventId: string, signal?: AbortSignal) =>
    api.delete<void>(`${EVENTS_PATH}/${eventId}`, undefined, signal),
  archive: (eventId: string, signal?: AbortSignal) =>
    api.post<KasagiEvent>(`${EVENTS_PATH}/${eventId}/archive`, undefined, signal),
};

export const invitationApi = {
  get: (inviteCode: string, signal?: AbortSignal) =>
    api.get<Invitation>(
      `${INVITATIONS_PATH}/${encodeURIComponent(inviteCode)}`,
      signal,
    ),
  join: (inviteCode: string, signal?: AbortSignal) =>
    api.post<KasagiEvent>(
      `${INVITATIONS_PATH}/${encodeURIComponent(inviteCode)}/join`,
      undefined,
      signal,
    ),
};
