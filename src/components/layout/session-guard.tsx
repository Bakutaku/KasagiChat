"use client";

import { useEffect } from "react";
import { watchSession } from "@/lib/api/session";

export function SessionGuard() {
  useEffect(watchSession, []);
  return null;
}
