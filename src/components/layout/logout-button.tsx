"use client";

import { LuLoaderCircle, LuLogOut } from "react-icons/lu";
import { useLogout } from "./use-logout";

export default function LogoutButton() {
  const { logout, isLoggingOut, error } = useLogout();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={logout}
        className="btn btn-primary"
        type="button"
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <LuLoaderCircle className="animate-spin" aria-hidden="true" />
        ) : (
          <LuLogOut aria-hidden="true" />
        )}
        Logout
      </button>
      {error && (
        <p className="text-xs text-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
