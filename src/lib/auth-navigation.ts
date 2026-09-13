export type AuthState =
  "unauthenticated" | "pending" | "registered" | "unknown";

export function safeInvitationPath(value: string | undefined): string | null {
  return value && /^\/join\/[A-Za-z0-9]{6,8}$/.test(value) ? value : null;
}

/** リダイレクト先だけを決定します。SESSIONの検証は既存のSpring APIに委ねます。 */
export function authDestination(
  state: AuthState,
  pathname: string,
  invitation?: string,
): string | null {
  if (state === "unauthenticated")
    return pathname === "/login" ? null : "/login";
  if (state === "pending") return pathname === "/signup" ? null : "/signup";
  if (state === "registered") {
    const pendingInvitation = safeInvitationPath(invitation);
    if (pendingInvitation && ["/home", "/login", "/signup"].includes(pathname))
      return pendingInvitation;
    return pathname === "/login" || pathname === "/signup" ? "/home" : null;
  }
  return null;
}
