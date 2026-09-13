"use client";

import { useState } from "react";
import { usePrototype } from "./store";
import type { Scene } from "./types";

/** 家・街・誕生画面から同じ会話を再開するための共通入口です。 */
export function useConversation() {
  const { state, dispatch } = usePrototype();
  const [conversationId, setConversationId] = useState<string | null>(null);
  function start(scene: Scene) {
    const previous = state.conversations.find(
      (item) => item.scene === scene && item.status !== "reviewed",
    );
    const id = previous?.id ?? crypto.randomUUID();
    if (!previous) dispatch({ type: "start", id, scene });
    setConversationId(id);
  }
  return { conversationId, setConversationId, start };
}
