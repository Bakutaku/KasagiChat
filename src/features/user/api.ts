import { api } from "@/lib/api/client";

/** GET /api/user/me の応答のうち、画面表示に使う項目。 */
export type CurrentUser = {
  publicId: string;
  displayName: string;
  avatarUrl: string | null;
};

export const userApi = {
  me: (signal?: AbortSignal) => api.get<CurrentUser>("/api/user/me", signal),
};
