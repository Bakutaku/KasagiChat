"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { prototypeReducer, restoreState } from "./service";
import type { PrototypeAction, PrototypeState } from "./types";

function createStore(preview: boolean) {
  const key = `kasagichat:prototype:v1:${preview ? "preview" : "app"}`;
  let snapshot: PrototypeState | null = null;
  let storageAvailable = true;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    storageAvailable: () => storageAvailable,
    hydrate() {
      // SSRでは保存内容を読みません。初回描画をそろえてからタブ内の状態を復元します。
      if (snapshot) return;
      try {
        snapshot = restoreState(sessionStorage.getItem(key));
      } catch {
        snapshot = restoreState(null);
        storageAvailable = false;
      }
      emit();
    },
    dispatch(action: PrototypeAction) {
      if (!snapshot) return;
      snapshot = prototypeReducer(snapshot, action);
      try {
        sessionStorage.setItem(key, JSON.stringify(snapshot));
      } catch {
        storageAvailable = false;
      }
      emit();
    },
  };
}

type PrototypeContextValue = {
  state: PrototypeState;
  dispatch: (action: PrototypeAction) => void;
  preview: boolean;
  href: (path: string) => string;
  storageAvailable: boolean;
};
const PrototypeContext = createContext<PrototypeContextValue | null>(null);
const getServerSnapshot = () => null;

export function PrototypeProvider({
  preview,
  children,
}: {
  preview: boolean;
  children: ReactNode;
}) {
  const [store] = useState(() => createStore(preview));
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    getServerSnapshot,
  );
  useEffect(() => {
    store.hydrate();
  }, [store]);
  if (!state)
    return (
      <div className="grid min-h-[60vh] place-items-center" role="status">
        <span
          className="loading loading-ring loading-lg"
          aria-label="画面を準備しています"
        />
      </div>
    );
  return (
    <PrototypeContext.Provider
      value={{
        state,
        dispatch: store.dispatch,
        preview,
        href: (path) => `${preview ? "/preview" : ""}${path}`,
        storageAvailable: store.storageAvailable(),
      }}
    >
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (!context) throw new Error("PrototypeProvider が必要です。");
  return context;
}
